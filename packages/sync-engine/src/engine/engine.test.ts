import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {
    cleanups,
    createChannels,
    ENGINE_TEST_SCHEMA,
    eventually,
    startClient,
    startEngine,
} from '../testing/engineHarness';
import {
    block,
    blockText,
    doc,
} from '../testing/fixtures';
import {createMemoryProjectionStore} from '../testing/memoryProjectionStore';
import {bodyDocToScriptDocument, getBodyFragment} from '../ydoc/bodyCodec';
import {getMetaMap, SCHEMA_VERSION_KEY} from '../ydoc/mapCodec';
import {createSyncEngine} from './createSyncEngine';
import type {SyncEngineClient} from './createSyncEngineClient';
import type {SyncEngine} from './engineTypes';
import {createMemoryDocPersistence} from './persistence';
import {bodyDocName, metaDocName} from './protocol';

const SCHEMA = ENGINE_TEST_SCHEMA;

const createStore = (initial: Record<string, ScriptDocument> = {}) => {
    const {
        store,
        documents,
        documentWrites,
    } = createMemoryProjectionStore(initial);

    return {
        store,
        documents,
        writes: documentWrites,
    };
};

const texts = (document: ScriptDocument | undefined) => document?.content.map(node => node.content?.[0]?.text ?? '');

const SCRIPT = 's1';
const stored = () => doc(block('scene', 'h1', 'INT. HALL'), block('dialogue', 'd1', 'Hello'));

describe('sync engine', () => {
    it('seeds a body once from the projection and normalizes it', async () => {
        const channels = createChannels();
        const persistence = createMemoryDocPersistence();
        const {store, writes} = createStore({[SCRIPT]: doc(block('dialogue', 'd1', 'No scene yet'))});
        const first = startEngine({
            ...channels,
            store,
            persistence,
        });

        await first.open(SCRIPT);
        await first.stop();
        cleanups.pop();

        // The seed added nothing (scene heading only for empty docs) and was projected once.
        expect(writes).toHaveLength(1);

        const second = startEngine({
            ...channels,
            store: {...store, loadDocument: () => Promise.reject(new Error('must not reseed'))},
            persistence,
        });

        expect(await second.open(SCRIPT)).toEqual({schemaVersion: SCHEMA});
        expect(persistence.store.get(bodyDocName(SCRIPT))?.length).toBeGreaterThan(0);
    });

    it('seeds a default scene for a script without blocks', async () => {
        const channels = createChannels();
        const {store, documents} = createStore();
        const engine = startEngine({
            ...channels,
            store,
            persistence: createMemoryDocPersistence(),
        });

        await engine.open(SCRIPT);

        expect(documents.get(SCRIPT)?.content.some(node => node.type === 'scene')).toBe(true);
    });

    it('keeps two tabs in sync and projects their edits on flush', async () => {
        const channels = createChannels();
        const {store, documents} = createStore({[SCRIPT]: stored()});

        startEngine({
            ...channels,
            store,
            persistence: createMemoryDocPersistence(),
        });

        const tabA = await startClient(channels).openScript(SCRIPT);
        const tabB = await startClient(channels).openScript(SCRIPT);

        expect(texts(bodyDocToScriptDocument(tabA.body))).toEqual(['INT. HALL', 'Hello']);

        blockText(tabA.body, 1).insert(5, ' from A');
        await eventually(() => texts(bodyDocToScriptDocument(tabB.body))?.[1] === 'Hello from A');

        blockText(tabB.body, 0).insert(0, '1. ');
        await tabB.flush();

        expect(texts(documents.get(SCRIPT))).toEqual(['1. INT. HALL', 'Hello from A']);
    });

    it('debounces projection of edits without an explicit flush', async () => {
        const channels = createChannels();
        const {store, documents} = createStore({[SCRIPT]: stored()});

        startEngine({
            ...channels,
            store,
            persistence: createMemoryDocPersistence(),
        });

        const tab = await startClient(channels).openScript(SCRIPT);

        blockText(tab.body, 1).insert(0, '>> ');
        await eventually(() => texts(documents.get(SCRIPT))?.[1] === '>> Hello');
    });

    it('survives a leader handoff without losing edits made in between', async () => {
        const channels = createChannels();
        const persistence = createMemoryDocPersistence();
        const {store, documents} = createStore({[SCRIPT]: stored()});
        const leader: SyncEngine = createSyncEngine({
            ...channels,
            store,
            persistence,
            clientSchemaVersion: SCHEMA,
            projectionDelayMs: 20,
        });
        const client: SyncEngineClient = startClient(channels);
        const tab = await client.openScript(SCRIPT);

        blockText(tab.body, 1).insert(5, ' (before)');
        await tab.flush();
        await leader.stop();

        // No leader: the edit stays in the tab replica.
        blockText(tab.body, 0).insert(0, '[gap] ');

        startEngine({
            ...channels,
            store,
            persistence,
        });
        await tab.flush();

        expect(texts(documents.get(SCRIPT))).toEqual(['[gap] INT. HALL', 'Hello (before)']);
    });

    it('applies an outside projection rewrite as Y ops (no duplicates in replicas)', async () => {
        const channels = createChannels();
        const {store, documents} = createStore({[SCRIPT]: stored()});
        const engine = startEngine({
            ...channels,
            store,
            persistence: createMemoryDocPersistence(),
        });
        const client = startClient(channels);
        const tab = await client.openScript(SCRIPT);

        documents.set(SCRIPT, doc(block('scene', 'r1', 'RESTORED'), block('stageDirection', 'r2', 'Lights.')));
        await client.notifyScriptReplaced(SCRIPT);

        await eventually(() => texts(bodyDocToScriptDocument(tab.body))?.[0] === 'RESTORED');
        expect(getBodyFragment(tab.body).length).toBe(2);
        expect(engine).toBeDefined();
    });

    it('deletes the stored Y state of a deleted script', async () => {
        const channels = createChannels();
        const persistence = createMemoryDocPersistence();
        const {store} = createStore({[SCRIPT]: stored()});
        const engine = startEngine({
            ...channels,
            store,
            persistence,
        });

        await engine.open(SCRIPT);
        await engine.scriptDeleted(SCRIPT);

        expect(persistence.store.has(bodyDocName(SCRIPT))).toBe(false);
        expect(persistence.store.has(metaDocName(SCRIPT))).toBe(false);
    });

    it('does not project docs from a newer schema (read-only gate)', async () => {
        const channels = createChannels();
        const persistence = createMemoryDocPersistence();
        const {store, writes} = createStore({[SCRIPT]: stored()});
        const first = startEngine({
            ...channels,
            store,
            persistence,
        });

        await first.open(SCRIPT);
        await first.stop();
        cleanups.pop();

        // A newer client bumped the schema version in the shared meta doc.
        const newer = new Y.Doc();

        Y.applyUpdate(newer, Y.mergeUpdates(persistence.store.get(metaDocName(SCRIPT)) ?? []));
        getMetaMap(newer).set(SCHEMA_VERSION_KEY, SCHEMA + 1);
        persistence.store.set(metaDocName(SCRIPT), [Y.encodeStateAsUpdate(newer)]);

        startEngine({
            ...channels,
            store,
            persistence,
        });

        const tab = await startClient(channels).openScript(SCRIPT);
        const before = writes.length;

        expect(tab.schemaVersion).toBe(SCHEMA + 1);

        blockText(tab.body, 0).insert(0, 'x');
        await tab.flush();

        expect(writes.length).toBe(before);
    });
});

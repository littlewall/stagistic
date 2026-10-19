import {SCRIPT_DOCUMENT_SCHEMA_VERSION, type ScriptDocument} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {
    createMemoryDocPersistence,
    createSyncEngine,
    createSyncEngineClient,
    readRecords,
    RECORD_COLLECTIONS,
    type SyncEngine,
    type SyncEngineClient,
} from '@stagistic/sync-engine';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {listScriptCharacters} from '../../queries';
import {InMemoryFileStorage} from '../../storage/fileStorage';
import {createTestDb} from '../../testing/createTestDb';
import {createLocalPgliteRepository} from '../createLocalPgliteRepository';
import {createScriptProjectionStore} from '../document/projectionStore';
import {readScriptRecords} from './readScriptRecords';
import {withDocumentSync} from './withDocumentSync';
import {writeScriptRecords} from './writeScriptRecords';

const SCRIPT = 'script-1';
const body: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-1'},
            content: [{type: 'text', text: 'INT. HALL'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'direction-1'},
            content: [{type: 'text', text: 'Dark.'}],
        },
    ],
};

const stops: Array<() => Promise<void> | void> = [];

afterEach(async () => {
    for (const stop of stops.splice(0).toReversed()) {
        await stop();
    }
});

const eventually = async (check: () => Promise<boolean> | boolean, timeoutMs = 10_000) => {
    const deadline = Date.now() + timeoutMs;

    while (!await check()) {
        if (Date.now() > deadline) {
            throw new Error('condition not met in time');
        }

        await new Promise(resolve => setTimeout(resolve, 20));
    }
};

const setup = async () => {
    const {db} = await createTestDb();
    const getDb = () => Promise.resolve(db);
    const ns = crypto.randomUUID();
    const channels = {
        controlChannelFactory: () => new BroadcastChannel(`${ns}:engine`) as never,
        docChannelFactory: (name: string) => new BroadcastChannel(`${ns}:${name}`) as never,
    };
    const engine: SyncEngine = createSyncEngine({
        ...channels,
        store: createScriptProjectionStore({getDb, syncDb: () => Promise.resolve()}),
        persistence: createMemoryDocPersistence(),
        clientSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        projectionDelayMs: 10,
    });
    const client: SyncEngineClient = createSyncEngineClient({...channels, retryMs: 50});

    stops.push(() => engine.stop(), () => client.destroy());

    const local = createLocalPgliteRepository({
        getLocalDb: getDb,
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });
    const repository = withDocumentSync(local, {getDb, documents: client});

    await repository.createScriptWithId({
        id: SCRIPT,
        title: 'Hamlet',
        initialContent: body,
    });

    return {
        db,
        engine,
        client,
        repository,
    };
};

describe('script records', () => {
    it('round-trips projection rows through records', async () => {
        const {db, repository} = await setup();

        await repository.confirmScriptCharacterWithId(SCRIPT, {
            id: 'c1',
            key: 'Hamlet',
            colorHex: '#112233',
        });
        await repository.upsertScriptCharacterGenderWithId(SCRIPT, {id: 'g1', label: 'Male'});
        await repository.createScriptLocationWithId(SCRIPT, {id: 'l1', name: 'Hall'});
        await repository.replaceScriptSceneLocations(SCRIPT, 'scene-1', ['l1']);
        await repository.saveTitlePage(SCRIPT, {subtitle: 'A tragedy', contact: 'wings'});
        await repository.saveScriptSettings(SCRIPT, {visual: {characterDecoration: 'none'}});
        await repository.createScriptCommentThread(SCRIPT, {
            id: 't1',
            messageId: 'm1',
            anchorKind: 'block',
            anchorBlockId: 'direction-1',
            quotedText: 'Dark.',
            body: 'Darker?',
        });

        const meta = await readScriptRecords(db, SCRIPT, 'meta');
        const comments = await readScriptRecords(db, SCRIPT, 'comments');

        expect(meta.characters.c1).toMatchObject({
            key: 'HAMLET',
            kind: 'character',
            colorHex: '#112233',
        });
        expect(meta.scenes['scene-1']).toMatchObject({locationIds: ['l1']});
        expect(meta.titlePage.script).toMatchObject({subtitle: 'A tragedy', contact: 'wings'});
        expect(meta.script.script).toEqual({title: 'Hamlet', subtitle: 'A tragedy'});
        expect(comments.messages.m1).toMatchObject({threadId: 't1', body: 'Darker?'});

        // Writing the same records back changes nothing.
        expect(await db.transaction(tx => writeScriptRecords(tx, SCRIPT, 'meta', meta))).toBe(false);
        expect(await db.transaction(tx => writeScriptRecords(tx, SCRIPT, 'comments', comments))).toBe(false);
    });

    it('mirrors repository mutations into the Y.Doc', async () => {
        const {client, repository} = await setup();
        const replica = await client.openScript(SCRIPT);

        stops.push(() => replica.release());

        await repository.confirmScriptCharacterWithId(SCRIPT, {id: 'c1', key: 'Hamlet'});
        await repository.setScriptCharacterColor(SCRIPT, 'c1', '#ff0000');
        await repository.createScriptLocationWithId(SCRIPT, {id: 'l1', name: 'Hall'});
        await repository.renameScript(SCRIPT, {title: 'The Tragedy of Hamlet', subtitle: null});

        await eventually(() => {
            const records = readRecords(replica.meta, RECORD_COLLECTIONS.meta);

            return records.characters.c1?.colorHex === '#ff0000'
                && records.locations.l1?.name === 'Hall'
                && records.script.script?.title === 'The Tragedy of Hamlet';
        });
    });

    it('projects a remote edit and merges a duplicate character key', async () => {
        const {
            db,
            client,
            repository,
        } = await setup();
        const replica = await client.openScript(SCRIPT);

        stops.push(() => replica.release());

        await repository.confirmScriptCharacterWithId(SCRIPT, {
            id: 'c1',
            key: 'Hamlet',
            timestamp: 10,
        });

        // Another device: recolors HAMLET and confirms OPHELIA and its own HAMLET (newer).
        await eventually(() => replica.meta.getMap<Y.Map<unknown>>('characters').has('c1'));
        replica.meta.transact(() => {
            const characters = replica.meta.getMap<Y.Map<unknown>>('characters');
            const createCharacter = (fields: Record<string, unknown>) => {
                const record = new Y.Map<unknown>();

                Object.entries(fields).forEach(([key, value]) => record.set(key, value));

                return record;
            };

            requireValue(characters.get('c1')).set('colorHex', '#00ff00');
            characters.set('c2', createCharacter({
                key: 'OPHELIA',
                kind: 'character',
                colorHex: null,
                createdAt: 20,
            }));
            characters.set('c3', createCharacter({
                key: 'HAMLET',
                kind: 'character',
                outline: 'Prince',
                createdAt: 30,
            }));
        });

        await eventually(async () => {
            const rows = await listScriptCharacters(db, SCRIPT);

            return rows.length === 2 && rows.some(row => row.key === 'OPHELIA');
        });

        const hamlet = (await listScriptCharacters(db, SCRIPT)).find(row => row.key === 'HAMLET');

        expect(hamlet).toMatchObject({
            id: 'c1',
            colorHex: '#00ff00',
            outline: 'Prince',
        });
    });

    it('copies pending edits when duplicating', async () => {
        const {client, repository} = await setup();
        const replica = await client.openScript(SCRIPT);

        stops.push(() => replica.release());

        // An edit only the Y.Doc has (projection still debounced).
        (replica.body.getXmlFragment('body').get(1) as Y.XmlElement).insert(0, [new Y.XmlText('Pitch ')]);

        const copyId = await repository.duplicateScript(SCRIPT, {
            title: 'Copy',
            copySettings: true,
            copyAttributes: true,
        });
        const copy = await repository.loadLatest(copyId);

        expect(JSON.stringify(copy)).toContain('Pitch');
    });
});

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    cleanups,
    createChannels,
    eventually,
    startClient,
    startEngine,
} from '../testing/engineHarness';
import {block, doc} from '../testing/fixtures';
import {createMemoryProjectionStore} from '../testing/memoryProjectionStore';
import {readRecords} from '../ydoc/recordsCodec';
import {createMemoryDocPersistence} from './persistence';
import {RECORD_COLLECTIONS} from './scriptRecords';

const SCRIPT = 's1';
const hamlet = {
    key: 'HAMLET',
    kind: 'character',
    colorHex: null,
    createdAt: 1,
};

const setup = () => {
    const channels = createChannels();
    const persistence = createMemoryDocPersistence();
    const projection = createMemoryProjectionStore({[SCRIPT]: doc(block('scene', 'h1', 'INT. HALL'))});

    projection.setRecords(SCRIPT, 'meta', {characters: {c1: hamlet}});
    projection.setRecords(SCRIPT, 'comments', {threads: {t1: {status: 'open', createdAt: 1}}});

    return {
        channels,
        persistence,
        projection,
    };
};

describe('sync engine records', () => {
    it('seeds meta and comments docs once from the projection', async () => {
        const {
            channels,
            persistence,
            projection,
        } = setup();
        const first = startEngine({
            ...channels,
            store: projection.store,
            persistence,
        });

        await first.open(SCRIPT);
        await first.stop();
        cleanups.pop();

        // A changed projection must not re-seed an already seeded doc.
        projection.setRecords(SCRIPT, 'meta', {characters: {c2: {...hamlet, key: 'OPHELIA'}}});

        const second = startEngine({
            ...channels,
            store: projection.store,
            persistence,
        });

        await second.open(SCRIPT);
        await second.flush(SCRIPT);

        expect(projection.readRecordsOf(SCRIPT, 'comments').threads).toEqual({t1: {status: 'open', createdAt: 1}});
        expect(Object.keys(projection.readRecordsOf(SCRIPT, 'meta').characters)).toEqual(['c2']);
    });

    it('mirrors a repository mutation into the Y.Doc and the projection', async () => {
        const {
            channels,
            persistence,
            projection,
        } = setup();

        startEngine({
            ...channels,
            store: projection.store,
            persistence,
        });

        const client = startClient(channels);
        const tab = await client.openScript(SCRIPT);

        await client.applyRecordChanges(SCRIPT, 'meta', {characters: {c1: {before: hamlet, after: {...hamlet, colorHex: '#f00'}}}});

        expect(projection.readRecordsOf(SCRIPT, 'meta').characters.c1.colorHex).toBe('#f00');
        await eventually(() => readRecords(tab.meta, RECORD_COLLECTIONS.meta).characters.c1?.colorHex === '#f00');
    });

    it('re-projects a field that a concurrent edit won over the local value', async () => {
        const {
            channels,
            persistence,
            projection,
        } = setup();
        const engine = startEngine({
            ...channels,
            store: projection.store,
            persistence,
        });

        await engine.open(SCRIPT);
        // Remote edit already in Y; the local mutation started from the stale `hamlet`.
        await engine.applyRecords(SCRIPT, 'meta', {characters: {c1: {before: hamlet, after: {...hamlet, colorHex: '#0f0'}}}});
        projection.setRecords(SCRIPT, 'meta', {characters: {c1: {...hamlet, colorHex: '#00f'}}});
        await engine.applyRecords(SCRIPT, 'meta', {characters: {c1: {before: hamlet, after: {...hamlet, colorHex: '#00f'}}}});

        expect(projection.readRecordsOf(SCRIPT, 'meta').characters.c1.colorHex).toBe('#0f0');
    });

    it('merges duplicate character keys before projecting', async () => {
        const {
            channels,
            persistence,
            projection,
        } = setup();
        const engine = startEngine({
            ...channels,
            store: projection.store,
            persistence,
        });

        await engine.applyRecords(SCRIPT, 'meta', {characters: {c9: {
            before: null,
            after: {
                ...hamlet,
                colorHex: '#f00',
                createdAt: 9,
            },
        }}});
        await engine.flush(SCRIPT);

        expect(projection.readRecordsOf(SCRIPT, 'meta').characters).toEqual({c1: {...hamlet, colorHex: '#f00'}});
    });

    it('replaces records from a rewritten projection as Y ops', async () => {
        const {
            channels,
            persistence,
            projection,
        } = setup();

        startEngine({
            ...channels,
            store: projection.store,
            persistence,
        });

        const client = startClient(channels);
        const tab = await client.openScript(SCRIPT);

        projection.setRecords(SCRIPT, 'meta', {characters: {c3: {...hamlet, key: 'HORATIO'}}});
        await client.notifyScriptReplaced(SCRIPT);

        await eventually(() => Object.keys(readRecords(tab.meta, RECORD_COLLECTIONS.meta).characters).join() === 'c3');
    });
});

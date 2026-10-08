import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {eq} from 'drizzle-orm';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {scripts} from '../../schema';
import {
    createTestDb,
    seedScript,
    type TestDb,
} from '../../testing/createTestDb';
import {createScriptBodyProjectionStore} from './bodyProjectionStore';
import {loadScriptDocumentFromProjection} from './documentProjection';

const block = (type: string, id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: [{type: 'text', text}],
});

const doc = (...content: ScriptNode[]): ScriptDocument => ({type: 'doc', content});

const createStore = (db: TestDb) => {
    let flushes = 0;
    const store = createScriptBodyProjectionStore({
        getDb: () => Promise.resolve(db),
        syncDb: () => {
            flushes++;

            return Promise.resolve();
        },
    });

    return {store, flushes: () => flushes};
};

const readScriptRow = async (db: TestDb, scriptId: string) => {
    const [row] = await db.select().from(scripts).where(eq(scripts.id, scriptId));

    return row;
};

describe('createScriptBodyProjectionStore', () => {
    it('loads nothing for a script without blocks', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        expect(await createStore(db).store.loadDocument('s1')).toBeNull();
    });

    it('writes deltas, bumps updatedAt and summary metadata only on change', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const {store, flushes} = createStore(db);
        const first = doc(block('scene', 'h1', 'INT. HALL'), block('dialogue', 'd1', 'Hello'));

        await store.writeDocument('s1', first);

        const afterFirst = await readScriptRow(db, 's1');

        expect((await loadScriptDocumentFromProjection(db, 's1'))?.document.content.map(node => node.content?.[0]?.text)).toEqual(['INT. HALL', 'Hello']);
        expect(afterFirst?.summaryMetadata).toMatchObject({sceneCount: 1});

        await db.update(scripts).set({updatedAt: 1}).where(eq(scripts.id, 's1'));
        await store.writeDocument('s1', first);
        expect((await readScriptRow(db, 's1'))?.updatedAt).toBe(1);

        await store.writeDocument('s1', doc(block('scene', 'h1', 'INT. HALL'), block('dialogue', 'd1', 'Hello there')));
        expect((await readScriptRow(db, 's1'))?.updatedAt).toBeGreaterThan(1);
        expect(flushes()).toBe(3);
    });

    it('a fresh store instance picks up the existing projection as baseline', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await createStore(db).store.writeDocument('s1', doc(block('scene', 'h1', 'ONE'), block('dialogue', 'd1', 'A')));

        const second = createStore(db).store;

        await second.writeDocument('s1', doc(block('scene', 'h1', 'ONE'), block('dialogue', 'd2', 'B')));

        const loaded = await loadScriptDocumentFromProjection(db, 's1');

        expect(loaded?.document.content.map(node => node.attrs?.id)).toEqual(['h1', 'd2']);
    });
});

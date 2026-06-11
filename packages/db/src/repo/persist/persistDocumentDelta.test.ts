import {asc, eq} from 'drizzle-orm';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {rebuildScriptDocumentFromBlocks, type RewriteScriptDocument} from '../../blocks';
import {scriptBlocks} from '../../schema';
import {
    createTestDb, seedScript, type TestDb,
} from '../../testing/createTestDb';
import {createDocumentPersister} from './persistDocumentDelta';

const doc = (blocks: {
    id: string, type?: string, text: string,
}[]): RewriteScriptDocument => ({
    type: 'doc',
    content: blocks.map(b => ({
        type: 'fountainBlock',
        attrs: {id: b.id, blockType: b.type ?? 'fountain_action'},
        content: b.text ? [{type: 'text', text: b.text}] : [],
    })),
});

const readBlocks = async (db: TestDb, scriptId: string) => {
    const rows = await db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, scriptId))
        .orderBy(asc(scriptBlocks.blockOrder));

    return rows.map(r => ({
        id: r.id, type: r.blockType, text: r.textContent, order: r.blockOrder,
    }));
};

describe('persistDocumentDelta', () => {
    it('persists the first save (all inserts) and round-trips', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'INT. ROOM',
            }, {id: 'a1', text: 'Action one.'},
        ]));

        expect(await readBlocks(db, 's1')).toEqual([
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'INT. ROOM', order: 'a0',
            }, {
                id: 'a1', type: 'fountain_action', text: 'Action one.', order: 'a1',
            },
        ]);
    });

    it('text change updates only the changed block', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([{id: 'a1', text: 'hi'}]));
        await persister.persist(db, doc([{id: 'a1', text: 'hello'}]));

        expect(await readBlocks(db, 's1')).toEqual([
            {
                id: 'a1', type: 'fountain_action', text: 'hello', order: 'a0',
            },
        ]);
    });

    it('reorder survives (no unique violation) and round-trips in new order', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'A',
            },
            {id: 'x', text: 'x'},
            {
                id: 'h2', type: 'fountain_scene_heading', text: 'B',
            },
            {id: 'y', text: 'y'},
        ]));

        await persister.persist(db, doc([
            {
                id: 'h2', type: 'fountain_scene_heading', text: 'B',
            },
            {id: 'y', text: 'y'},
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'A',
            },
            {id: 'x', text: 'x'},
        ]));

        expect((await readBlocks(db, 's1')).map(b => b.id)).toEqual([
            'h2',
            'y',
            'h1',
            'x',
        ]);
    });

    it('block type change persists', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {
                id: 'a1', type: 'fountain_action', text: 'X',
            },
        ]));
        await persister.persist(db, doc([
            {
                id: 'a1', type: 'fountain_character', text: 'X',
            },
        ]));

        expect((await readBlocks(db, 's1'))[0].type).toBe('fountain_character');
    });

    it('delete removes the block and round-trips', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'A',
            }, {id: 'a1', text: 'one'},
        ]));
        await persister.persist(db, doc([
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'A',
            },
        ]));

        expect((await readBlocks(db, 's1')).map(b => b.id)).toEqual(['h1']);
    });

    it('reconstructed document matches what was persisted', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'INT. ROOM',
            }, {id: 'a1', text: 'Action.'},
        ]));

        const storedBlocks = await db
            .select()
            .from(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, 's1'))
            .orderBy(asc(scriptBlocks.blockOrder));
        const rebuilt = rebuildScriptDocumentFromBlocks('s1', storedBlocks.map(r => ({
            id: r.id,
            blockType: r.blockType,
            blockOrder: r.blockOrder,
            textContent: r.textContent,
            contentJson: r.contentJson,
            columnGroupId: r.columnGroupId,
            columnIndex: r.columnIndex,
        })), []);

        expect(rebuilt.document.content.map(n => n.attrs?.id)).toEqual(['h1', 'a1']);
    });
});

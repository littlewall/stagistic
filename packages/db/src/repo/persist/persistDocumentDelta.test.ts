import {asc, eq} from 'drizzle-orm';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    extractScriptBlocks,
    rebuildScriptDocumentFromBlocks,
    type RewriteScriptDocument,
} from '../../blocks';
import {
    scriptActs, scriptBlocks, scriptScenes,
} from '../../schema';
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

    it('pure reorder re-keys only the moved blocks and skips scene/act reconciliation', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');
        const sceneA = [
            {
                id: 'h1', type: 'fountain_scene_heading', text: 'A',
            },
            {id: 'a1', text: 'one'},
            {id: 'a2', text: 'two'},
        ];
        const sceneB = [
            {
                id: 'h2', type: 'fountain_scene_heading', text: 'B',
            }, {id: 'b1', text: 'bee'},
        ];

        await persister.persist(db, doc([...sceneA, ...sceneB]));

        const ordersBefore = new Map((await readBlocks(db, 's1')).map(b => [b.id, b.order]));
        const scenesBefore = await db.select().from(scriptScenes).where(eq(scriptScenes.scriptId, 's1'));

        await persister.persist(db, doc([...sceneB, ...sceneA]));

        const ordersAfter = new Map((await readBlocks(db, 's1')).map(b => [b.id, b.order]));
        const scenesAfter = await db.select().from(scriptScenes).where(eq(scriptScenes.scriptId, 's1'));

        // The longer (unmoved) scene keeps its keys byte-identical.
        for (const id of [
            'h1',
            'a1',
            'a2',
        ]) {
            expect(ordersAfter.get(id)).toBe(ordersBefore.get(id));
        }

        expect((await readBlocks(db, 's1')).map(b => b.id)).toEqual([
            'h2',
            'b1',
            'h1',
            'a1',
            'a2',
        ]);
        // Fast path: scene rows untouched (same updatedAt).
        expect(scenesAfter).toEqual(scenesBefore);
    });

    it('insert lands between anchors without re-keying neighbors', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([{id: 'a1', text: 'one'}, {id: 'a2', text: 'two'}]));

        const ordersBefore = new Map((await readBlocks(db, 's1')).map(b => [b.id, b.order]));

        await persister.persist(db, doc([
            {id: 'a1', text: 'one'},
            {id: 'mid', text: 'between'},
            {id: 'a2', text: 'two'},
        ]));

        const after = await readBlocks(db, 's1');
        const ordersAfter = new Map(after.map(b => [b.id, b.order]));

        expect(after.map(b => b.id)).toEqual([
            'a1',
            'mid',
            'a2',
        ]);
        expect(ordersAfter.get('a1')).toBe(ordersBefore.get('a1'));
        expect(ordersAfter.get('a2')).toBe(ordersBefore.get('a2'));
        expect((ordersAfter.get('mid') as string) > (ordersAfter.get('a1') as string)).toBe(true);
        expect((ordersAfter.get('mid') as string) < (ordersAfter.get('a2') as string)).toBe(true);
    });

    it('act heading rename does not take the fast path and updates the act row', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc([
            {
                id: 'act1', type: 'fountain_act', text: 'ACT ONE',
            }, {id: 'a1', text: 'one'},
        ]));
        await persister.persist(db, doc([
            {
                id: 'act1', type: 'fountain_act', text: 'ACT 1 RENAMED',
            }, {id: 'a1', text: 'one'},
        ]));

        const acts = await db.select().from(scriptActs).where(eq(scriptActs.scriptId, 's1'));

        expect(acts).toHaveLength(1);
        expect(acts[0].name).toBe('ACT 1 RENAMED');
    });

    it('falls back to a full re-key when the baseline has no order keys', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const blocks = [
            {id: 'a1', text: 'one'},
            {id: 'a2', text: 'two'},
            {id: 'a3', text: 'three'},
        ];
        const persister = createDocumentPersister('s1');

        await persister.persist(db, doc(blocks));

        // Fresh persister seeded without order keys (e.g. legacy/loader edge case).
        const persister2 = createDocumentPersister('s1');

        persister2.setBaseline(extractScriptBlocks('s1', doc(blocks)).blocks);

        await persister2.persist(db, doc([
            blocks[2],
            blocks[0],
            blocks[1],
        ]));

        expect((await readBlocks(db, 's1')).map(b => b.id)).toEqual([
            'a3',
            'a1',
            'a2',
        ]);
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

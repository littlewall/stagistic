import {asc, eq} from 'drizzle-orm';
import {
    describe, expect, it,
} from 'vite-plus/test';

import type {RewriteScriptDocument} from '../../blocks';
import {scriptBlocks} from '../../schema';
import {
    createTestDb, seedScript, type TestDb,
} from '../../testing/createTestDb';
import {createDocumentPersister} from './persistDocumentDelta';

interface Scene {
    headingId: string,
    blockIds: string[],
}

// Build a doc from an ordered list of scenes (heading + action blocks).
const docFromScenes = (scenes: Scene[]): RewriteScriptDocument => ({
    type: 'doc',
    content: scenes.flatMap(scene => [
        {
            type: 'fountainBlock',
            attrs: {id: scene.headingId, blockType: 'fountain_scene_heading'},
            content: [{type: 'text', text: scene.headingId.toUpperCase()}],
        }, ...scene.blockIds.map(id => ({
            type: 'fountainBlock',
            attrs: {id, blockType: 'fountain_action'},
            content: [{type: 'text', text: id}],
        })),
    ]),
});

const expectedFlatIds = (scenes: Scene[]): string[] => {
    return scenes.flatMap(scene => [scene.headingId, ...scene.blockIds]);
};

const readIds = async (db: TestDb, scriptId: string): Promise<string[]> => {
    const rows = await db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, scriptId))
        .orderBy(asc(scriptBlocks.blockOrder));

    return rows.map(row => row.id);
};

const readOrders = async (db: TestDb, scriptId: string): Promise<Map<string, string>> => {
    const rows = await db
        .select({id: scriptBlocks.id, blockOrder: scriptBlocks.blockOrder})
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, scriptId));

    return new Map(rows.map(row => [row.id, row.blockOrder]));
};

describe('persistDocumentDelta at scale', () => {
    it('reorders a scene in a ~400-block script correctly and quickly', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const sceneCount = 8;
        const blocksPerScene = 50;
        const scenes: Scene[] = Array.from({length: sceneCount}, (_, s) => ({
            headingId: `h${s}`,
            blockIds: Array.from({length: blocksPerScene}, (_, b) => `s${s}b${b}`),
        }));

        const persister = createDocumentPersister('s1');

        await persister.persist(db, docFromScenes(scenes));
        expect(await readIds(db, 's1')).toEqual(expectedFlatIds(scenes));

        // Move the last scene to the front (shifts every other block's order).
        const reordered = [scenes[sceneCount - 1], ...scenes.slice(0, sceneCount - 1)];

        const ordersBefore = await readOrders(db, 's1');
        const startedAt = Date.now();

        await persister.persist(db, docFromScenes(reordered));

        const elapsed = Date.now() - startedAt;

        expect(await readIds(db, 's1')).toEqual(expectedFlatIds(reordered));

        /*
         * Minimal re-keying: every block outside the moved scene keeps its
         * block_order byte-identical — a scene move writes M keys, not N.
         */
        const ordersAfter = await readOrders(db, 's1');
        const movedIds = new Set(expectedFlatIds([scenes[sceneCount - 1]]));

        for (const [id, order] of ordersBefore) {
            if (!movedIds.has(id)) {
                expect(ordersAfter.get(id)).toBe(order);
            }
        }

        /*
         * Bulk write must be well under a second even for hundreds of blocks.
         * (Per-row round-trips would take many seconds.)
         */
        expect(elapsed).toBeLessThan(1000);
    });
});

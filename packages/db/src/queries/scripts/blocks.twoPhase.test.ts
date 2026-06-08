import {asc, eq} from 'drizzle-orm';
import {generateNKeysBetween} from 'fractional-indexing';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {scriptBlocks} from '../../schema';
import {
    createTestDb, seedScript, type TestDb,
} from '../../testing/createTestDb';
import {writeFinalBlockOrders} from './blocks';

const insertBlock = async (db: TestDb, scriptId: string, id: string, blockOrder: string) => {
    const now = Date.now();

    await db.insert(scriptBlocks).values({
        id,
        scriptId,
        blockType: 'fountain_action',
        blockOrder,
        textContent: id,
        contentJson: null,
        sceneId: null,
        actId: null,
        columnGroupId: null,
        columnIndex: null,
        createdAt: now,
        updatedAt: now,
    });
};

const readOrder = async (db: TestDb, scriptId: string) => {
    const rows = await db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, scriptId))
        .orderBy(asc(scriptBlocks.blockOrder));

    return rows.map(row => row.id);
};

describe('writeFinalBlockOrders', () => {
    it('reverses order without issues', async () => {
        const {db} = await createTestDb();
        const keys = generateNKeysBetween(null, null, 3);

        await seedScript(db, 's1');
        await insertBlock(db, 's1', 'a', keys[0]);
        await insertBlock(db, 's1', 'b', keys[1]);
        await insertBlock(db, 's1', 'c', keys[2]);

        // Reverse: c gets first key, b middle, a last
        const newKeys = generateNKeysBetween(null, null, 3);

        await db.transaction(async tx => {
            await writeFinalBlockOrders(tx, 's1', [
                {id: 'c', blockOrder: newKeys[0]},
                {id: 'b', blockOrder: newKeys[1]},
                {id: 'a', blockOrder: newKeys[2]},
            ]);
        });

        expect(await readOrder(db, 's1')).toEqual([
            'c',
            'b',
            'a',
        ]);
    });

    it('handles a single swap of adjacent rows', async () => {
        const {db} = await createTestDb();
        const keys = generateNKeysBetween(null, null, 2);

        await seedScript(db, 's1');
        await insertBlock(db, 's1', 'a', keys[0]);
        await insertBlock(db, 's1', 'b', keys[1]);

        // Swap: b gets first key, a gets second
        const newKeys = generateNKeysBetween(null, null, 2);

        await db.transaction(async tx => {
            await writeFinalBlockOrders(tx, 's1', [{id: 'b', blockOrder: newKeys[0]}, {id: 'a', blockOrder: newKeys[1]}]);
        });

        expect(await readOrder(db, 's1')).toEqual(['b', 'a']);
    });
});

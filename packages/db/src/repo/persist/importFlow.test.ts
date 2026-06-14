import {asc, eq} from 'drizzle-orm';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {migrateLegacyJsonToBlocksForScript, rebuildScriptDocumentFromBlocks} from '../../blocks';
import {scriptBlocks} from '../../schema';
import {createTestDb, seedScript} from '../../testing/createTestDb';

describe('script import with fractional indexing', () => {
    it('imports a fountain document and assigns fractional index keys', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const doc = {
            type: 'doc' as const,
            content: [
                {
                    type: 'scene',
                    attrs: {id: 'h1'},
                    content: [{type: 'text', text: 'INT. ROOM - DAY'}],
                },
                {
                    type: 'stageDirection',
                    attrs: {id: 'a1'},
                    content: [{type: 'text', text: 'A dark room.'}],
                },
                {
                    type: 'character',
                    attrs: {id: 'c1'},
                    content: [{type: 'text', text: 'JOHN'}],
                },
                {
                    type: 'dialogue',
                    attrs: {id: 'd1'},
                    content: [{type: 'text', text: 'Hello world.'}],
                },
            ],
        };

        const result = await migrateLegacyJsonToBlocksForScript(db, 's1', {
            sourceDocument: doc,
            force: true,
            trigger: 'test',
        });

        expect(result.status).toBe('success');
        expect(result.storedBlockCount).toBe(4);

        const blocks = await db
            .select()
            .from(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, 's1'))
            .orderBy(asc(scriptBlocks.blockOrder));

        // Verify 4 blocks in correct order
        expect(blocks.map(b => b.id)).toEqual([
            'h1',
            'a1',
            'c1',
            'd1',
        ]);

        // Verify blockOrder is a string (fractional index), not a number
        blocks.forEach(b => {
            expect(typeof b.blockOrder).toBe('string');
            expect(b.blockOrder.length).toBeGreaterThan(0);
        });

        // Verify lexicographic sort matches document order
        for (let i = 1; i < blocks.length; i++) {
            expect(blocks[i].blockOrder > blocks[i - 1].blockOrder).toBe(true);
        }
    });

    it('round-trips: import then rebuild produces same block order', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        const doc = {
            type: 'doc' as const,
            content: [
                {
                    type: 'scene',
                    attrs: {id: 'scene1'},
                    content: [{type: 'text', text: 'EXT. PARK - NIGHT'}],
                }, {
                    type: 'stageDirection',
                    attrs: {id: 'action1'},
                    content: [{type: 'text', text: 'Trees sway in the wind.'}],
                },
            ],
        };

        await migrateLegacyJsonToBlocksForScript(db, 's1', {
            sourceDocument: doc,
            force: true,
            trigger: 'test',
        });

        const storedBlocks = await db
            .select()
            .from(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, 's1'))
            .orderBy(asc(scriptBlocks.blockOrder));

        const rebuilt = rebuildScriptDocumentFromBlocks(
            's1',
            storedBlocks.map(r => ({
                id: r.id,
                blockType: r.blockType,
                blockOrder: r.blockOrder,
                textContent: r.textContent,
                contentJson: r.contentJson,
                columnGroupId: r.columnGroupId,
                columnIndex: r.columnIndex,
            })),
            [],
        );

        expect(rebuilt.document.content.map(n => n.attrs?.id)).toEqual(['scene1', 'action1']);
    });
});

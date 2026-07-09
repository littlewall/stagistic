import {asc, eq} from 'drizzle-orm';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    makeSceneId,
    rebuildScriptDocumentFromBlocks,
    type RewriteScriptDocument,
} from '../blocks';
import {
    scriptBlocks,
    scriptLocations,
    scriptScenes,
} from '../schema';
import {
    createTestDb,
    seedScript,
    type TestDb,
} from '../testing/createTestDb';
import {
    loadScriptDocumentFromProjection,
    rebuildScriptProjection,
} from './documentProjection';

const doc = (blocks: {
    id: string, type?: string, text: string,
}[]): RewriteScriptDocument => ({
    type: 'doc',
    content: blocks.map(b => ({
        type: b.type ?? 'stageDirection',
        attrs: {id: b.id},
        content: b.text ? [{type: 'text', text: b.text}] : [],
    })),
});

const readBlockIds = async (db: TestDb, scriptId: string) => {
    const rows = await db
        .select({id: scriptBlocks.id})
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, scriptId))
        .orderBy(asc(scriptBlocks.blockOrder));

    return rows.map(row => row.id);
};

describe('documentProjection', () => {
    it('rebuilds projection rows, removes stale rows, and preserves surviving scene metadata', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');

        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: doc([
                {
                    id: 'h1', type: 'scene', text: 'A',
                },
                {id: 'a1', text: 'old'},
                {
                    id: 'h2', type: 'scene', text: 'B',
                },
                {id: 'b1', text: 'stale'},
            ]),
        });

        const sceneId = makeSceneId('s1', 'h1');
        const now = Date.now();

        await db.insert(scriptLocations).values({
            id: 'loc1',
            scriptId: 's1',
            name: 'Rehearsal Room',
            description: null,
            createdAt: now,
            updatedAt: now,
        });
        await db
            .update(scriptScenes)
            .set({
                colorHex: '#112233',
                synopsis: 'Keep this synopsis',
                locationId: 'loc1',
                updatedAt: now,
            })
            .where(eq(scriptScenes.id, sceneId));

        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: doc([
                {
                    id: 'h1', type: 'scene', text: 'A renamed',
                },
                {id: 'a2', text: 'new'},
            ]),
        });

        expect(await readBlockIds(db, 's1')).toEqual(['h1', 'a2']);

        const scenes = await db
            .select()
            .from(scriptScenes)
            .where(eq(scriptScenes.scriptId, 's1'));

        expect(scenes).toHaveLength(1);
        expect(scenes[0]).toMatchObject({
            id: sceneId,
            headingBlockId: 'h1',
            sceneNumber: '1',
            colorHex: '#112233',
            synopsis: 'Keep this synopsis',
            locationId: 'loc1',
        });
    });

    it('loads the rebuilt projection as a script document', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: doc([
                {
                    id: 'h1', type: 'scene', text: 'INT. ROOM',
                },
                {id: 'a1', text: 'Action.'},
            ]),
        });

        const loaded = await loadScriptDocumentFromProjection(db, 's1');

        expect(loaded?.document.content.map(node => node.attrs?.id)).toEqual(['h1', 'a1']);

        const storedBlocks = await db
            .select()
            .from(scriptBlocks)
            .where(eq(scriptBlocks.scriptId, 's1'))
            .orderBy(asc(scriptBlocks.blockOrder));
        const rebuilt = rebuildScriptDocumentFromBlocks('s1', storedBlocks.map(row => ({
            id: row.id,
            blockType: row.blockType,
            blockOrder: row.blockOrder,
            textContent: row.textContent,
            contentJson: row.contentJson,
        })), []);

        expect(rebuilt.document.content.map(node => node.attrs?.id)).toEqual(['h1', 'a1']);
    });
});

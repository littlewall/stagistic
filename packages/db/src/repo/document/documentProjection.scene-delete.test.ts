import {eq} from 'drizzle-orm';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    makeSceneId,
    type RewriteScriptDocument,
} from '../../blocks';
import {
    scriptLocations,
    scriptSceneLocations,
    scriptScenes,
} from '../../schema';
import {
    createTestDb,
    seedScript,
    type TestDb,
} from '../../testing/createTestDb';
import {rebuildScriptProjection} from './documentProjection';

const doc = (blocks: {
    id: string,
    type?: string,
    text: string,
}[]): RewriteScriptDocument => ({
    type: 'doc',
    content: blocks.map(b => ({
        type: b.type ?? 'stageDirection',
        attrs: {id: b.id},
        content: b.text ? [{type: 'text', text: b.text}] : [],
    })),
});

/*
 * A two-scene document whose second scene owns an action block. The metadata
 * (synopsis + an assigned place) is attached in `seedSecondSceneMetadata`.
 */
const twoScenes = doc([
    {
        id: 'h1',
        type: 'scene',
        text: 'INT. ROOM',
    },
    {id: 'a1', text: 'Anna waits.'},
    {
        id: 'h2',
        type: 'scene',
        text: 'EXT. STREET',
    },
    {id: 'b1', text: 'Rain falls.'},
]);

/*
 * The same document with the second scene heading removed: its action block
 * `b1` survives and reparents under the first scene.
 */
const headingRemoved = doc([
    {
        id: 'h1',
        type: 'scene',
        text: 'INT. ROOM',
    },
    {id: 'a1', text: 'Anna waits.'},
    {id: 'b1', text: 'Rain falls.'},
]);

const seedSecondSceneMetadata = async (db: TestDb, scriptId: string) => {
    const now = Date.now();
    const sceneId = makeSceneId(scriptId, 'h2');

    await db.insert(scriptLocations).values({
        id: 'loc1',
        scriptId,
        name: 'Street',
        description: null,
        createdAt: now,
        updatedAt: now,
    });
    await db
        .update(scriptScenes)
        .set({synopsis: 'A downpour', updatedAt: now})
        .where(eq(scriptScenes.id, sceneId));
    await db.insert(scriptSceneLocations).values({sceneId, locationId: 'loc1'});

    return sceneId;
};

describe('documentProjection scene-heading deletion', () => {
    it('removing a scene heading prunes its scriptScenes row and cascades scene locations', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: twoScenes,
        });

        const removedSceneId = await seedSecondSceneMetadata(db, 's1');

        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: headingRemoved,
        });

        const scenes = await db
            .select()
            .from(scriptScenes)
            .where(eq(scriptScenes.scriptId, 's1'));

        expect(scenes.map(scene => scene.headingBlockId)).toEqual(['h1']);
        expect(scenes.some(scene => scene.id === removedSceneId)).toBe(false);

        // The cascade on script_scene_locations.scene_id removes the assignment.
        const sceneLocations = await db
            .select()
            .from(scriptSceneLocations)
            .where(eq(scriptSceneLocations.sceneId, removedSceneId));

        expect(sceneLocations).toEqual([]);
    });

    it('re-adding the same heading restores its metadata', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: twoScenes,
        });

        const sceneId = await seedSecondSceneMetadata(db, 's1');

        // Delete the heading, then re-project the original document (undo).
        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: headingRemoved,
        });
        await rebuildScriptProjection({
            db,
            scriptId: 's1',
            document: twoScenes,
        });

        const scenes = await db
            .select()
            .from(scriptScenes)
            .where(eq(scriptScenes.id, sceneId));

        expect(scenes).toHaveLength(1);
        expect(scenes[0]).toMatchObject({
            headingBlockId: 'h2',
            synopsis: 'A downpour',
            colorHex: null,
            locationId: null,
        });

        const sceneLocations = await db
            .select()
            .from(scriptSceneLocations)
            .where(eq(scriptSceneLocations.sceneId, sceneId));

        expect(sceneLocations).toEqual([{sceneId, locationId: 'loc1'}]);
    });
});

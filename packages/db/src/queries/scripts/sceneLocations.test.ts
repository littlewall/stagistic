import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    createTestDb,
    seedScript,
} from '../../testing/createTestDb';
import {upsertScriptLocation} from './locations';
import {
    listScriptSceneLocations,
    replaceScriptSceneLocations,
} from './sceneLocations';
import {upsertScriptScene} from './scenes';

const seedLocation = async (
    db: Parameters<typeof upsertScriptLocation>[0],
    id: string,
    scriptId: string,
) => {
    await upsertScriptLocation(db, {
        id,
        scriptId,
        name: id,
        description: null,
        createdAt: 1,
        updatedAt: 1,
    });
};

const seedScene = async (
    db: Parameters<typeof upsertScriptScene>[0],
    id: string,
    scriptId: string,
    headingBlockId: string,
) => {
    await upsertScriptScene(db, {
        id,
        scriptId,
        headingBlockId,
        sceneNumber: '1',
        colorHex: null,
        synopsis: null,
        locationId: null,
        createdAt: 1,
        updatedAt: 1,
    });
};

describe('script scene location queries', () => {
    it('replaces a scene assignment with multiple locations', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');
        await seedScene(db, 'scene-1', 'script-1', 'heading-1');
        await seedLocation(db, 'place-1', 'script-1');
        await seedLocation(db, 'place-2', 'script-1');

        await replaceScriptSceneLocations(db, {
            scriptId: 'script-1',
            sceneHeadingBlockId: 'heading-1',
            locationIds: ['place-1', 'place-2'],
        });

        expect(await listScriptSceneLocations(db, 'script-1')).toEqual([{sceneHeadingBlockId: 'heading-1', locationId: 'place-1'}, {sceneHeadingBlockId: 'heading-1', locationId: 'place-2'}]);
    });

    it('ignores locations from another script and clears removed assignments', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');
        await seedScript(db, 'script-2');
        await seedScene(db, 'scene-1', 'script-1', 'heading-1');
        await seedLocation(db, 'place-1', 'script-1');
        await seedLocation(db, 'other-place', 'script-2');

        expect(await replaceScriptSceneLocations(db, {
            scriptId: 'script-1',
            sceneHeadingBlockId: 'heading-1',
            locationIds: ['place-1', 'other-place'],
        })).toEqual(['place-1']);

        await replaceScriptSceneLocations(db, {
            scriptId: 'script-1',
            sceneHeadingBlockId: 'heading-1',
            locationIds: [],
        });

        expect(await listScriptSceneLocations(db, 'script-1')).toEqual([]);
    });
});

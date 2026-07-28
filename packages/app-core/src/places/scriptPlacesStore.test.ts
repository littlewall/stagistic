import {
    createInMemoryReactiveQuerySource,
    type ScriptLocation,
    type ScriptRepository,
    type ScriptSceneLocationAssignment,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptPlacesStore} from './scriptPlacesStore';

const place: ScriptLocation = {
    id: 'place-1',
    scriptId: 'script-1',
    name: 'Stage',
    description: null,
    createdAt: 1,
    updatedAt: 1,
};

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise, resolve, reject,
    };
};

type PlacesRepository = Pick<
    ScriptRepository,
    | 'allocateScriptLocationId'
    | 'getScriptLocationsSource'
    | 'getScriptSceneLocationsSource'
    | 'createScriptLocationWithId'
    | 'renameScriptLocation'
    | 'deleteScriptLocation'
    | 'replaceScriptSceneLocations'
>;

const createRepository = () => {
    const locations = createInMemoryReactiveQuerySource<ScriptLocation>([place]);
    const assignments = createInMemoryReactiveQuerySource<ScriptSceneLocationAssignment>([{sceneHeadingBlockId: 'scene-1', locationId: place.id}]);
    let nextId = 1;
    const adapter: PlacesRepository = {
        allocateScriptLocationId: () => `new-place-${nextId++}`,
        getScriptLocationsSource: () => locations,
        getScriptSceneLocationsSource: () => assignments,
        createScriptLocationWithId: async (scriptId, input) => {
            const created: ScriptLocation = {
                id: input.id,
                scriptId,
                name: input.name,
                description: null,
                createdAt: input.timestamp ?? 1,
                updatedAt: input.timestamp ?? 1,
            };

            locations.emit([...await locations.read(), created]);

            return created;
        },
        renameScriptLocation: async (_scriptId, locationId, name) => {
            const renamed = (await locations.read()).find(row => row.id === locationId);

            if (!renamed) {
                return null;
            }

            const result = {...renamed, name};

            locations.emit((await locations.read()).map(row => {
                return row.id === locationId ? result : row;
            }));

            return result;
        },
        deleteScriptLocation: async (_scriptId, locationId) => {
            locations.emit((await locations.read()).filter(row => row.id !== locationId));
            assignments.emit((await assignments.read()).filter(row => row.locationId !== locationId));
        },
        replaceScriptSceneLocations: async (_scriptId, sceneId, locationIds) => {
            const otherScenes = (await assignments.read()).filter(row => row.sceneHeadingBlockId !== sceneId);

            assignments.emit([
                ...otherScenes, ...locationIds.map(locationId => ({
                    sceneHeadingBlockId: sceneId,
                    locationId,
                })),
            ]);

            return locationIds;
        },
    };

    return {
        repository: adapter as unknown as ScriptRepository,
        locations,
        assignments,
    };
};

describe('script places store', () => {
    it('shows create immediately and confirms it from the source', async () => {
        const {repository, locations} = createRepository();
        const gate = deferred();
        const originalCreate = repository.createScriptLocationWithId.bind(repository);

        repository.createScriptLocationWithId = async (...args) => {
            await gate.promise;

            return originalCreate(...args);
        };

        const store = createScriptPlacesStore(repository, 'script-1');

        await Promise.all([store.locationsCollection.preload(), store.assignmentsCollection.preload()]);

        const create = store.createPlace(' Backstage ');

        expect(store.locationsCollection.get('new-place-1')?.name).toBe('Backstage');
        expect((await locations.read()).some(row => row.id === 'new-place-1')).toBe(false);

        gate.resolve();
        await create;

        expect((await locations.read()).some(row => row.id === 'new-place-1')).toBe(true);
    });

    it('rolls a rename back and exposes failure status', async () => {
        const {repository} = createRepository();
        const gate = deferred();

        repository.renameScriptLocation = () => gate.promise.then(() => null);

        const store = createScriptPlacesStore(repository, 'script-1');

        await store.locationsCollection.preload();

        const rename = store.renamePlace(place.id, 'Rejected');

        expect(store.locationsCollection.get(place.id)?.name).toBe('Rejected');

        gate.reject(new Error('duplicate place'));
        await expect(rename).rejects.toThrow('duplicate place');

        expect(store.locationsCollection.get(place.id)?.name).toBe('Stage');
        expect(store.locationsStatus.getSnapshot().mutations[0]).toMatchObject({
            entityKey: place.id,
            status: 'failed',
        });
    });

    it('replaces scene assignments optimistically and removes cascaded links', async () => {
        const {
            repository,
            assignments,
        } = createRepository();
        const gate = deferred();
        const originalReplace = repository.replaceScriptSceneLocations.bind(repository);

        repository.replaceScriptSceneLocations = async (...args) => {
            await gate.promise;

            return originalReplace(...args);
        };

        const store = createScriptPlacesStore(repository, 'script-1');

        await Promise.all([store.locationsCollection.preload(), store.assignmentsCollection.preload()]);

        const replace = store.setScenePlaces('scene-1', ['place-2', 'place-2']);

        expect(Array.from(store.assignmentsCollection.values())).toMatchObject([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: 'place-2',
            },
        ]);

        gate.resolve();
        await replace;

        expect(await assignments.read()).toEqual([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: 'place-2',
            },
        ]);

        assignments.emit([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: place.id,
            },
        ]);
        await store.deletePlace(place.id);

        expect(Array.from(store.assignmentsCollection.values())).not.toContainEqual(
            expect.objectContaining({locationId: place.id}),
        );
    });

    it('serializes rapid replacements for one scene and keeps the newest intent', async () => {
        const {
            repository,
            assignments,
        } = createRepository();
        const gates = [deferred(), deferred()];
        const persisted: string[][] = [];

        repository.replaceScriptSceneLocations = async (_scriptId, sceneId, ids) => {
            const index = persisted.length;

            persisted.push(ids);
            await gates[index]?.promise;
            assignments.emit(ids.map(locationId => ({
                sceneHeadingBlockId: sceneId,
                locationId,
            })));

            return ids;
        };

        const store = createScriptPlacesStore(repository, 'script-1');

        await store.assignmentsCollection.preload();

        const first = store.setScenePlaces('scene-1', ['place-2']);
        const second = store.setScenePlaces('scene-1', ['place-3']);

        expect(Array.from(store.assignmentsCollection.values())).toMatchObject([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: 'place-3',
            },
        ]);
        await Promise.resolve();
        await Promise.resolve();
        expect(persisted).toEqual([['place-2']]);

        gates[0]?.resolve();
        await first;
        expect(persisted).toEqual([['place-2'], ['place-3']]);

        gates[1]?.resolve();
        await second;

        expect(await assignments.read()).toEqual([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: 'place-3',
            },
        ]);
    });

    it('rolls a failed scene replacement back and retains an attributable error', async () => {
        const {repository} = createRepository();
        const gate = deferred();

        repository.replaceScriptSceneLocations = () => gate.promise.then(() => []);

        const store = createScriptPlacesStore(repository, 'script-1');

        await store.assignmentsCollection.preload();

        const replace = store.setScenePlaces('scene-1', ['place-2']);

        expect(Array.from(store.assignmentsCollection.values())).toMatchObject([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: 'place-2',
            },
        ]);

        gate.reject(new Error('assignment failed'));
        await expect(replace).rejects.toThrow('assignment failed');

        expect(Array.from(store.assignmentsCollection.values())).toMatchObject([
            {
                sceneHeadingBlockId: 'scene-1',
                locationId: place.id,
            },
        ]);
        expect(store.assignmentsStatus.getSnapshot().mutations[0]).toMatchObject({
            entityKey: 'scene-1',
            status: 'failed',
        });
    });
});

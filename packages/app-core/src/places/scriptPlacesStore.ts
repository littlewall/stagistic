import type {
    ScriptLocation,
    ScriptRepository,
    ScriptSceneLocationAssignment,
} from '@stagistic/db';
import {createOptimisticAction} from '@tanstack/react-db';

import {
    createReactiveCollection,
    toDomainCollectionValue,
} from '../collections';

const assignmentKey = (assignment: ScriptSceneLocationAssignment) => `${assignment.sceneHeadingBlockId}:${assignment.locationId}`;
const normalizeIds = (ids: string[]) => [...new Set(ids)].sort();

const createEntityQueue = () => {
    const queues = new Map<string, Promise<void>>();

    return (key: string, task: () => Promise<void>) => {
        const previous = queues.get(key) ?? Promise.resolve();
        const current = previous.catch(() => undefined).then(task);

        queues.set(key, current);
        void current.finally(() => {
            if (queues.get(key) === current) {
                queues.delete(key);
            }
        }).catch(() => undefined);

        return current;
    };
};

export const createScriptPlacesStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const locationsSource = repository.getScriptLocationsSource(scriptId);
    const assignmentsSource = repository.getScriptSceneLocationsSource(scriptId);
    const locations = createReactiveCollection<ScriptLocation, string>({
        id: `script-locations:${scriptId}`,
        source: locationsSource,
        getKey: location => location.id,
        handlers: {
            insert: async location => {
                const created = await repository.createScriptLocationWithId(scriptId, {
                    id: location.id,
                    name: location.name,
                    timestamp: location.createdAt,
                });

                if (!created) {
                    throw new Error('The place could not be created');
                }
            },
            update: async (original, modified, changes) => {
                if (!('name' in changes)) {
                    return;
                }

                const renamed = await repository.renameScriptLocation(
                    scriptId,
                    original.id,
                    modified.name,
                );

                if (!renamed) {
                    throw new Error('The place could not be renamed');
                }
            },
            delete: location => repository.deleteScriptLocation(scriptId, location.id),
        },
    });
    const assignments = createReactiveCollection<ScriptSceneLocationAssignment, string>({
        id: `script-scene-locations:${scriptId}`,
        source: assignmentsSource,
        getKey: assignmentKey,
    });
    const enqueueSceneMutation = createEntityQueue();
    const replaceSceneAssignments = createOptimisticAction<{
        sceneHeadingBlockId: string,
        locationIds: string[],
    }>({
        onMutate: ({sceneHeadingBlockId, locationIds}) => {
            const existingKeys = Array.from(assignments.collection.entries())
                .filter(([, assignment]) => assignment.sceneHeadingBlockId === sceneHeadingBlockId)
                .map(([key]) => key);

            if (existingKeys.length > 0) {
                assignments.collection.delete(existingKeys);
            }

            const normalizedIds = normalizeIds(locationIds);

            if (normalizedIds.length > 0) {
                assignments.collection.insert(normalizedIds.map(locationId => ({
                    sceneHeadingBlockId,
                    locationId,
                })));
            }
        },
        mutationFn: async ({sceneHeadingBlockId, locationIds}) => {
            await enqueueSceneMutation(sceneHeadingBlockId, async () => {
                assignments.status.startMutation({
                    entityKey: sceneHeadingBlockId,
                    action: 'update',
                });

                try {
                    const expectedIds = normalizeIds(await repository.replaceScriptSceneLocations(
                        scriptId,
                        sceneHeadingBlockId,
                        normalizeIds(locationIds),
                    ));

                    await assignmentsSource.refresh();

                    const confirmedIds = normalizeIds((await assignmentsSource.read())
                        .filter(assignment => assignment.sceneHeadingBlockId === sceneHeadingBlockId)
                        .map(assignment => assignment.locationId));

                    if (JSON.stringify(confirmedIds) !== JSON.stringify(expectedIds)) {
                        throw new Error(
                            `Scene places were not confirmed for ${sceneHeadingBlockId}`,
                        );
                    }

                    assignments.status.finishMutation(sceneHeadingBlockId, 'update');
                } catch (error) {
                    const normalizedError = error instanceof Error
                        ? error
                        : new Error(String(error));

                    assignments.status.failMutation(
                        sceneHeadingBlockId,
                        'update',
                        normalizedError,
                    );
                    throw normalizedError;
                }
            });
        },
    });

    const createPlace = async (name: string) => {
        const normalizedName = name.trim();

        if (!normalizedName) {
            return null;
        }

        const id = repository.allocateScriptLocationId();
        const timestamp = Date.now();
        const transaction = locations.collection.insert({
            id,
            scriptId,
            name: normalizedName,
            description: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        await transaction.isPersisted.promise;

        const place = locations.collection.get(id);

        return place ? toDomainCollectionValue(place) : null;
    };

    const renamePlace = async (placeId: string, name: string) => {
        const normalizedName = name.trim();

        if (!normalizedName) {
            return null;
        }

        const transaction = locations.collection.update(placeId, draft => {
            draft.name = normalizedName;
        });

        await transaction.isPersisted.promise;

        const place = locations.collection.get(placeId);

        return place ? toDomainCollectionValue(place) : null;
    };

    const deletePlace = async (placeId: string) => {
        const transaction = locations.collection.delete(placeId);

        await transaction.isPersisted.promise;
    };

    const setScenePlaces = async (
        sceneHeadingBlockId: string,
        locationIds: string[],
    ) => {
        const transaction = replaceSceneAssignments({
            sceneHeadingBlockId,
            locationIds,
        });

        await transaction.isPersisted.promise;

        return normalizeIds((await assignmentsSource.read())
            .filter(assignment => assignment.sceneHeadingBlockId === sceneHeadingBlockId)
            .map(assignment => assignment.locationId));
    };

    return {
        locationsCollection: locations.collection,
        locationsStatus: locations.status,
        assignmentsCollection: assignments.collection,
        assignmentsStatus: assignments.status,
        createPlace,
        renamePlace,
        deletePlace,
        setScenePlaces,
    };
};

export type ScriptPlacesStore = ReturnType<typeof createScriptPlacesStore>;

const storesByRepository = new WeakMap<
    ScriptRepository,
    Map<string, ScriptPlacesStore>
>();

export const getScriptPlacesStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    let stores = storesByRepository.get(repository);

    if (!stores) {
        stores = new Map();
        storesByRepository.set(repository, stores);
    }

    const existing = stores.get(scriptId);

    if (existing) {
        return existing;
    }

    const store = createScriptPlacesStore(repository, scriptId);

    stores.set(scriptId, store);

    return store;
};

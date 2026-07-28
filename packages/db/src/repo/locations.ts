import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {ScriptLocationsRepository} from '../scriptRepository';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

interface CreateLocationHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
}

export const createLocationHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateLocationHandlersArgs): ScriptLocationsRepository => {
    const list: ScriptLocationsRepository['list'] = async scriptId => {
        const db = await getDb();

        return dbQueries.listScriptLocations(db, scriptId);
    };

    const listSceneAssignments: ScriptLocationsRepository['listSceneAssignments'] = async scriptId => {
        const db = await getDb();

        return dbQueries.listScriptSceneLocations(db, scriptId);
    };

    const create: ScriptLocationsRepository['create'] = async (scriptId, input) => {
        return createWithId(scriptId, {
            ...input,
            id: uuidv7(),
        });
    };

    const createWithId: ScriptLocationsRepository['createWithId'] = async (
        scriptId,
        input,
    ) => {
        const name = input.name.trim();

        if (!name) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();
        const locationId = input.id;

        await db.transaction(async tx => {
            await dbQueries.upsertScriptLocation(tx, {
                id: locationId,
                scriptId,
                name,
                description: null,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `location:${locationId}`,
                opType: 'location.create',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId, locationId, name, createdAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptLocationById(db, {
            scriptId,
            locationId,
        });
    };

    const rename: ScriptLocationsRepository['rename'] = async (scriptId, locationId, nextName) => {
        const name = nextName.trim();

        if (!locationId || !name) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.updateScriptLocationName(tx, {
                scriptId,
                locationId,
                name,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `location:${locationId}`,
                opType: 'location.rename',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId, locationId, name, updatedAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return dbQueries.getScriptLocationById(db, {
            scriptId,
            locationId,
        });
    };

    const deleteLocation: ScriptLocationsRepository['delete'] = async (scriptId, locationId) => {
        if (!locationId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.deleteScriptLocation(tx, {scriptId, locationId});
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `location:${locationId}`,
                opType: 'location.delete',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId, locationId, deletedAt: now,
                }),
            }, tx);
        });
        await syncDb();
    };

    const replaceSceneAssignments: ScriptLocationsRepository['replaceSceneAssignments'] = async (
        scriptId,
        sceneHeadingBlockId,
        locationIds,
    ) => {
        if (!sceneHeadingBlockId) {
            return [];
        }

        const db = await getDb();
        const now = Date.now();
        const assignedLocationIds = await db.transaction(async tx => {
            const assignedIds = await dbQueries.replaceScriptSceneLocations(tx, {
                scriptId,
                sceneHeadingBlockId,
                locationIds,
            });

            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `scene:${sceneHeadingBlockId}:locations`,
                opType: 'scene.locations.replace',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    sceneHeadingBlockId,
                    locationIds: assignedIds,
                    updatedAt: now,
                }),
            }, tx);

            return assignedIds;
        });

        await syncDb();

        return assignedLocationIds;
    };

    return {
        list,
        listSceneAssignments,
        create,
        createWithId,
        rename,
        delete: deleteLocation,
        replaceSceneAssignments,
    };
};

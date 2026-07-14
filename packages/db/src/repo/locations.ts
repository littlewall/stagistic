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
        const name = input.name.trim();

        if (!name) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        const locationId = uuidv7();

        await dbQueries.upsertScriptLocation(db, {
            id: locationId,
            scriptId,
            name,
            description: null,
            createdAt: now,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'location.create',
            payloadJson: JSON.stringify({
                scriptId,
                locationId,
                name,
                createdAt: now,
            }),
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

        await dbQueries.updateScriptLocationName(db, {
            scriptId,
            locationId,
            name,
            updatedAt: now,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'location.rename',
            payloadJson: JSON.stringify({
                scriptId,
                locationId,
                name,
                updatedAt: now,
            }),
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

        await dbQueries.deleteScriptLocation(db, {
            scriptId,
            locationId,
        });
        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'location.delete',
            payloadJson: JSON.stringify({
                scriptId,
                locationId,
                deletedAt: now,
            }),
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
        const assignedLocationIds = await dbQueries.replaceScriptSceneLocations(db, {
            scriptId,
            sceneHeadingBlockId,
            locationIds,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'scene.locations.replace',
            payloadJson: JSON.stringify({
                scriptId,
                sceneHeadingBlockId,
                locationIds: assignedLocationIds,
                updatedAt: now,
            }),
        });
        await syncDb();

        return assignedLocationIds;
    };

    return {
        list,
        listSceneAssignments,
        create,
        rename,
        delete: deleteLocation,
        replaceSceneAssignments,
    };
};

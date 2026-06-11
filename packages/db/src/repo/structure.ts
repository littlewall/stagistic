import * as dbQueries from '../queries';
import {
    updateScriptSceneMetadata,
    type UpdateScriptSceneMetadataPayload,
    upsertScriptAct,
    type UpsertScriptActPayload,
    upsertScriptLocation,
    type UpsertScriptLocationPayload,
    upsertScriptScene,
    type UpsertScriptScenePayload,
} from '../queries';
import type {GetDb} from './types';

interface CreateStructureHandlersArgs {
    getDb: GetDb,
}

export const createScenesHandlers = ({getDb}: CreateStructureHandlersArgs) => ({
    list: async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.listScriptScenes(db, scriptId);
    },
    upsert: async (payload: UpsertScriptScenePayload) => {
        const db = await getDb();

        await upsertScriptScene(db, payload);
    },
    delete: async (sceneId: string) => {
        const db = await getDb();

        await dbQueries.deleteScriptScene(db, sceneId);
    },
    updateMetadata: async (payload: UpdateScriptSceneMetadataPayload) => {
        const db = await getDb();

        await updateScriptSceneMetadata(db, payload);
    },
});

export const createActsHandlers = ({getDb}: CreateStructureHandlersArgs) => ({
    list: async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.listScriptActs(db, scriptId);
    },
    upsert: async (payload: UpsertScriptActPayload) => {
        const db = await getDb();

        await upsertScriptAct(db, payload);
    },
    delete: async (actId: string) => {
        const db = await getDb();

        await dbQueries.deleteScriptAct(db, actId);
    },
});

export const createLocationsHandlers = ({getDb}: CreateStructureHandlersArgs) => ({
    list: async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.listScriptLocations(db, scriptId);
    },
    upsert: async (payload: UpsertScriptLocationPayload) => {
        const db = await getDb();

        await upsertScriptLocation(db, payload);
    },
    delete: async (locationId: string) => {
        const db = await getDb();

        await dbQueries.deleteScriptLocation(db, locationId);
    },
});

import * as dbQueries from '../queries';
import {
    bulkUpsertScriptBlocks,
    listScriptBlocks,
    type ListScriptBlocksOptions,
    reorderScriptBlocks,
    type ScriptBlockOrderMove,
    type ScriptBlockUpsertRow,
} from '../queries';
import type {GetDb} from './types';

interface CreateBlocksHandlersArgs {
    getDb: GetDb,
}

export const createBlocksHandlers = ({getDb}: CreateBlocksHandlersArgs) => ({
    list: async (scriptId: string, queryOptions?: ListScriptBlocksOptions) => {
        const db = await getDb();

        return listScriptBlocks(db, scriptId, queryOptions);
    },
    listByScene: async (sceneId: string) => {
        const db = await getDb();

        return dbQueries.listScriptBlocksByScene(db, sceneId);
    },
    listByAct: async (actId: string) => {
        const db = await getDb();

        return dbQueries.listScriptBlocksByAct(db, actId);
    },
    getById: async (blockId: string) => {
        const db = await getDb();

        return dbQueries.getScriptBlockById(db, blockId);
    },
    bulkUpsert: async (rows: ScriptBlockUpsertRow[]) => {
        const db = await getDb();

        await bulkUpsertScriptBlocks(db, rows);
    },
    bulkDelete: async (blockIds: string[]) => {
        const db = await getDb();

        await dbQueries.bulkDeleteScriptBlocks(db, blockIds);
    },
    reorder: async (scriptId: string, moves: ScriptBlockOrderMove[]) => {
        const db = await getDb();

        await reorderScriptBlocks(db, scriptId, moves);
    },
});

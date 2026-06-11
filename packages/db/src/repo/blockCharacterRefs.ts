import * as dbQueries from '../queries';
import {
    replaceScriptBlockCharacterRefs,
    type ScriptBlockCharacterRefRow,
} from '../queries';
import type {GetDb} from './types';

interface CreateBlockCharacterRefsHandlersArgs {
    getDb: GetDb,
}

export const createBlockCharacterRefsHandlers = ({getDb}: CreateBlockCharacterRefsHandlersArgs) => ({
    listByBlock: async (blockId: string) => {
        const db = await getDb();

        return dbQueries.listScriptBlockCharacterRefs(db, blockId);
    },
    listByScript: async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.listScriptCharacterRefsByScript(db, scriptId);
    },
    listByCharacter: async (characterId: string) => {
        const db = await getDb();

        return dbQueries.listScriptCharacterRefsByCharacter(db, characterId);
    },
    replaceForBlock: async (blockId: string, rows: ScriptBlockCharacterRefRow[]) => {
        const db = await getDb();

        await replaceScriptBlockCharacterRefs(db, blockId, rows);
    },
    deleteByCharacterIds: async (characterIds: string[]) => {
        const db = await getDb();

        await dbQueries.deleteScriptBlockRefsByCharacterIds(db, characterIds);
    },
});

import type {ScriptDocument} from '@stagistic/script';
import {
    trimOrFallback,
    uuidv7,
} from '@stagistic/shared';

import * as dbQueries from '../queries';
import {
    LEGACY_TO_BLOCKS_TRIGGERS,
    migrateScriptDocumentToBlocks,
} from './migration/legacyToBlocks';
import type {GetDb} from './types';

interface CreateScriptsHandlersArgs {
    getDb: GetDb,
}

export const createScriptsHandlers = ({getDb}: CreateScriptsHandlersArgs) => ({
    list: async (options?: Parameters<typeof dbQueries.listScripts>[1]) => {
        const db = await getDb();

        return dbQueries.listScripts(db, options);
    },
    getSummary: async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.getScriptSummary(db, scriptId);
    },
    create: async (title: string, initialContent?: ScriptDocument) => {
        const db = await getDb();
        const id = uuidv7();
        const now = Date.now();

        if (initialContent) {
            await db.transaction(async tx => {
                await dbQueries.insertScript(tx, {
                    id,
                    title: trimOrFallback(title, 'Untitled script'),
                    createdAt: now,
                    updatedAt: now,
                });

                await migrateScriptDocumentToBlocks({
                    db: tx,
                    scriptId: id,
                    sourceDocument: initialContent,
                    trigger: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                    context: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                });
            });
        } else {
            await dbQueries.insertScript(db, {
                id,
                title: trimOrFallback(title, 'Untitled script'),
                createdAt: now,
                updatedAt: now,
            });
        }

        return id;
    },
    rename: async (scriptId: string, title: string) => {
        const db = await getDb();
        const now = Date.now();
        const nextTitle = trimOrFallback(title, 'Untitled script');

        await dbQueries.updateScriptTitle(db, {
            id: scriptId,
            title: nextTitle,
            updatedAt: now,
        });
    },
    delete: async (scriptId: string) => {
        const db = await getDb();

        await dbQueries.deleteScript(db, scriptId);
    },
    setActiveBlock: async (scriptId: string, blockId: string | null) => {
        const db = await getDb();

        await dbQueries.updateActiveBlock(db, {
            scriptId,
            activeBlockId: blockId,
        });
    },
});

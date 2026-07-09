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
    rename: async (scriptId: string, input: {title: string, subtitle: string | null}) => {
        const db = await getDb();
        const now = Date.now();
        const nextTitle = trimOrFallback(input.title, 'Untitled script');
        const trimmedSubtitle = input.subtitle?.trim() ?? '';

        await dbQueries.updateScript(db, {
            id: scriptId,
            title: nextTitle,
            subtitle: trimmedSubtitle.length > 0 ? trimmedSubtitle : null,
            updatedAt: now,
        });
    },
    renameTitle: async (scriptId: string, title: string) => {
        const db = await getDb();

        await dbQueries.updateScriptTitle(db, {
            id: scriptId,
            title: trimOrFallback(title, 'Untitled script'),
            updatedAt: Date.now(),
        });
    },
    duplicate: async (
        sourceScriptId: string,
        input: {
            title: string, copySettings: boolean, copyAttributes: boolean,
        },
    ) => {
        const db = await getDb();
        const targetScriptId = uuidv7();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.duplicateScriptRows(tx, {
                sourceScriptId,
                targetScriptId,
                title: trimOrFallback(input.title, 'Untitled script'),
                now,
                copySettings: input.copySettings,
                copyAttributes: input.copyAttributes,
            });
        });

        return targetScriptId;
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

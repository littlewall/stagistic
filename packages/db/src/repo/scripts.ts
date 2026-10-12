import {buildScriptSummaryMetadata, type ScriptDocument} from '@stagistic/script';
import {
    trimOrFallback,
    uuidv7,
} from '@stagistic/shared';

import * as dbQueries from '../queries';
import {
    LEGACY_TO_BLOCKS_TRIGGERS,
    migrateScriptDocumentToBlocks,
} from './document/migration/legacyToBlocks';
import type {
    GetDb,
    SyncDb,
} from './types';

interface CreateScriptsHandlersArgs {
    getDb: GetDb,
    syncDb?: SyncDb,
}

export const createScriptsHandlers = ({
    getDb,
    syncDb = () => Promise.resolve(),
}: CreateScriptsHandlersArgs) => {
    const createWithId = async ({
        id,
        title,
        initialContent,
        activeBlockId,
        timestamp = Date.now(),
    }: {
        id: string,
        title: string,
        initialContent?: ScriptDocument,
        activeBlockId?: string | null,
        timestamp?: number,
    }) => {
        const db = await getDb();

        await db.transaction(async tx => {
            await dbQueries.insertScript(tx, {
                id,
                title: trimOrFallback(title, 'Untitled script'),
                createdAt: timestamp,
                updatedAt: timestamp,
                summaryMetadata: buildScriptSummaryMetadata(initialContent ?? {type: 'doc', content: []}),
            });

            if (initialContent) {
                await migrateScriptDocumentToBlocks({
                    db: tx,
                    scriptId: id,
                    sourceDocument: initialContent,
                    trigger: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                    context: LEGACY_TO_BLOCKS_TRIGGERS.createScript,
                });
            }

            if (activeBlockId !== undefined) {
                await dbQueries.updateActiveBlock(tx, {
                    scriptId: id,
                    activeBlockId,
                });
            }
        });
        await syncDb();
    };

    const duplicateWithId = async (
        sourceScriptId: string,
        input: {
            targetScriptId: string,
            title: string,
            copySettings: boolean,
            copyAttributes: boolean,
            timestamp?: number,
        },
    ) => {
        const db = await getDb();
        const now = input.timestamp ?? Date.now();

        await db.transaction(async tx => {
            await dbQueries.duplicateScriptRows(tx, {
                sourceScriptId,
                targetScriptId: input.targetScriptId,
                title: trimOrFallback(input.title, 'Untitled script'),
                now,
                copySettings: input.copySettings,
                copyAttributes: input.copyAttributes,
            });
        });
        await syncDb();
    };

    return {
        list: async (options?: Parameters<typeof dbQueries.listScripts>[1]) => {
            const db = await getDb();

            return dbQueries.listScripts(db, options);
        },
        getSummary: async (scriptId: string) => {
            const db = await getDb();

            return dbQueries.getScriptSummary(db, scriptId);
        },
        create: async (title: string, initialContent?: ScriptDocument) => {
            const id = uuidv7();

            await createWithId({
                id,
                title,
                initialContent,
            });

            return id;
        },
        createWithId,
        rename: async (scriptId: string, input: {title: string, subtitle: string | null}) => {
            const db = await getDb();
            const now = Date.now();
            const nextTitle = trimOrFallback(input.title, 'Untitled script');
            const trimmedSubtitle = input.subtitle?.trim() ?? '';

            await db.transaction(async tx => {
                await dbQueries.updateScript(tx, {
                    id: scriptId,
                    title: nextTitle,
                    subtitle: trimmedSubtitle.length > 0 ? trimmedSubtitle : null,
                    updatedAt: now,
                });
            });
            await syncDb();
        },
        renameTitle: async (scriptId: string, title: string) => {
            const db = await getDb();

            const now = Date.now();
            const nextTitle = trimOrFallback(title, 'Untitled script');

            await db.transaction(async tx => {
                await dbQueries.updateScriptTitle(tx, {
                    id: scriptId,
                    title: nextTitle,
                    updatedAt: now,
                });
            });
            await syncDb();
        },
        duplicate: async (
            sourceScriptId: string,
            input: {
                title: string,
                copySettings: boolean,
                copyAttributes: boolean,
            },
        ) => {
            const targetScriptId = uuidv7();

            await duplicateWithId(sourceScriptId, {
                ...input,
                targetScriptId,
            });

            return targetScriptId;
        },
        duplicateWithId,
        delete: async (scriptId: string) => {
            const db = await getDb();

            await db.transaction(async tx => {
                await dbQueries.deleteScript(tx, scriptId);
            });
            await syncDb();
        },
        setActiveBlock: async (scriptId: string, blockId: string | null) => {
            const db = await getDb();

            await db.transaction(async tx => {
                await dbQueries.updateActiveBlock(tx, {
                    scriptId,
                    activeBlockId: blockId,
                });
            });
            await syncDb();
        },
    };
};

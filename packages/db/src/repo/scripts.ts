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
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

interface CreateScriptsHandlersArgs {
    getDb: GetDb,
    recordOutbox?: RecordOutbox,
    syncDb?: SyncDb,
}

export const createScriptsHandlers = ({
    getDb,
    recordOutbox = () => Promise.resolve(),
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

            await recordOutbox({
                scriptId: id,
                entityKey: `script:${id}`,
                opType: 'script.create',
                occurredAt: timestamp,
                payloadJson: JSON.stringify({scriptId: id, createdAt: timestamp}),
            }, tx);
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
            await recordOutbox({
                scriptId: input.targetScriptId,
                entityKey: `script:${input.targetScriptId}`,
                opType: 'script.duplicate',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    sourceScriptId,
                    targetScriptId: input.targetScriptId,
                    createdAt: now,
                }),
            }, tx);
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
                id, title, initialContent,
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
                await recordOutbox({
                    scriptId,
                    entityKey: `script:${scriptId}`,
                    opType: 'script.rename',
                    occurredAt: now,
                    payloadJson: JSON.stringify({
                        scriptId, title: nextTitle, updatedAt: now,
                    }),
                }, tx);
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
                await recordOutbox({
                    scriptId,
                    entityKey: `script:${scriptId}`,
                    opType: 'script.title.rename',
                    occurredAt: now,
                    payloadJson: JSON.stringify({
                        scriptId, title: nextTitle, updatedAt: now,
                    }),
                }, tx);
            });
            await syncDb();
        },
        duplicate: async (
            sourceScriptId: string,
            input: {
                title: string, copySettings: boolean, copyAttributes: boolean,
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
            const now = Date.now();

            await db.transaction(async tx => {
                await dbQueries.deleteScript(tx, scriptId);
                await recordOutbox({
                    scriptId,
                    entityKey: `script:${scriptId}`,
                    opType: 'script.delete',
                    occurredAt: now,
                    payloadJson: JSON.stringify({scriptId, deletedAt: now}),
                }, tx);
            });
            await syncDb();
        },
        setActiveBlock: async (scriptId: string, blockId: string | null) => {
            const db = await getDb();
            const now = Date.now();

            await db.transaction(async tx => {
                await dbQueries.updateActiveBlock(tx, {
                    scriptId,
                    activeBlockId: blockId,
                });
                await recordOutbox({
                    scriptId,
                    entityKey: `script:${scriptId}`,
                    opType: 'script.active-block.set',
                    occurredAt: now,
                    payloadJson: JSON.stringify({
                        scriptId, blockId, updatedAt: now,
                    }),
                }, tx);
            });
            await syncDb();
        },
    };
};

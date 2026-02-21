import {
    dbQueries,
    type DbClient,
} from '@stagistic/db';
import {
    buildScriptBlockIndex,
    type IndexedScriptCharacterRef,
    SCRIPT_BLOCK_INDEX_SCHEMA_VERSION,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script-core';

import {
    computeContentHash,
    parseDocument,
    serializeDocument,
} from './documentCodec';
import type {GetDb} from './types';

interface CreateBlockIndexHandlersArgs {
    getDb: GetDb,
}

interface RebuildFromDocumentArgs {
    scriptId: string,
    value: ScriptDocument,
    contentHash?: string,
    updatedAt?: number,
    db?: DbClient,
}

const parseCharacterRefs = (value: string | null): IndexedScriptCharacterRef[] | null => {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value) as unknown;

        if (!Array.isArray(parsed)) {
            return null;
        }

        const refs: IndexedScriptCharacterRef[] = [];

        parsed.forEach(item => {
            if (!item || typeof item !== 'object') {
                return;
            }

            const key = typeof (item as {key?: unknown}).key === 'string'
                ? (item as {key: string}).key
                : '';
            const characterId = typeof (item as {characterId?: unknown}).characterId === 'string'
                ? (item as {characterId: string}).characterId
                : null;

            if (!key) {
                return;
            }

            refs.push({
                key,
                characterId,
            });
        });

        return refs.length > 0 ? refs : null;
    } catch {
        return null;
    }
};

const toSnapshotFromRows = (
    rows: Awaited<ReturnType<typeof dbQueries.listScriptBlockIndexRows>>,
): ScriptBlockIndexSnapshot => {
    return {
        blocks: rows.map(row => ({
            blockId: row.blockId,
            orderNo: row.orderNo,
            blockType: row.blockType,
            textContent: row.textContent,
            actBlockId: row.actBlockId,
            sceneBlockId: row.sceneBlockId,
            columnGroupOrder: row.columnGroupOrder,
            columnOrder: row.columnOrder,
            characterRefs: parseCharacterRefs(row.characterRefsJson),
        })),
    };
};

export const createBlockIndexHandlers = ({
    getDb,
}: CreateBlockIndexHandlersArgs) => {
    const rebuildScriptBlockIndexFromDocument = async ({
        scriptId,
        value,
        contentHash,
        updatedAt,
        db: dbOverride,
    }: RebuildFromDocumentArgs): Promise<ScriptBlockIndexSnapshot> => {
        const db = dbOverride ?? await getDb();
        const now = updatedAt ?? Date.now();
        const resolvedContentHash = contentHash ?? computeContentHash(serializeDocument(value));
        const snapshot = buildScriptBlockIndex(value).snapshot;
        const rows = snapshot.blocks.map(block => ({
            scriptId,
            blockId: block.blockId,
            orderNo: block.orderNo,
            blockType: block.blockType,
            textContent: block.textContent,
            actBlockId: block.actBlockId,
            sceneBlockId: block.sceneBlockId,
            columnGroupOrder: block.columnGroupOrder,
            columnOrder: block.columnOrder,
            characterRefsJson: block.characterRefs ? JSON.stringify(block.characterRefs) : null,
            updatedAt: now,
        }));

        await db.transaction(async tx => {
            await dbQueries.replaceScriptBlockIndexRows(tx, {
                scriptId,
                rows,
            });
            await dbQueries.upsertScriptBlockIndexMeta(tx, {
                scriptId,
                contentHash: resolvedContentHash,
                indexSchemaVersion: SCRIPT_BLOCK_INDEX_SCHEMA_VERSION,
                status: 'ready',
                updatedAt: now,
                lastError: null,
            });
        });

        return snapshot;
    };

    const markScriptBlockIndexStale = async (
        scriptId: string,
        contentHash: string,
        error: unknown,
    ) => {
        const db = await getDb();

        await dbQueries.upsertScriptBlockIndexMeta(db, {
            scriptId,
            contentHash,
            indexSchemaVersion: SCRIPT_BLOCK_INDEX_SCHEMA_VERSION,
            status: 'stale',
            updatedAt: Date.now(),
            lastError: error instanceof Error
                ? error.message
                : String(error),
        });
    };

    const rebuildScriptBlockIndex = async (scriptId: string) => {
        const db = await getDb();
        const latestContentJson = await dbQueries.getLatestContent(db, scriptId);

        if (!latestContentJson) {
            await db.transaction(async tx => {
                await dbQueries.replaceScriptBlockIndexRows(tx, {
                    scriptId,
                    rows: [],
                });
                await dbQueries.upsertScriptBlockIndexMeta(tx, {
                    scriptId,
                    contentHash: '',
                    indexSchemaVersion: SCRIPT_BLOCK_INDEX_SCHEMA_VERSION,
                    status: 'ready',
                    updatedAt: Date.now(),
                    lastError: null,
                });
            });

            return;
        }

        const latestMeta = await dbQueries.getLatestContentMeta(db, scriptId);
        const resolvedContentHash = latestMeta?.contentHash
            ?? computeContentHash(latestContentJson);
        const parsedValue = parseDocument(latestContentJson);

        try {
            await rebuildScriptBlockIndexFromDocument({
                scriptId,
                value: parsedValue,
                contentHash: resolvedContentHash,
                db,
            });
        } catch (error) {
            await markScriptBlockIndexStale(scriptId, resolvedContentHash, error);
            throw error;
        }
    };

    const ensureScriptBlockIndex = async (scriptId: string) => {
        const db = await getDb();
        const latestMeta = await dbQueries.getLatestContentMeta(db, scriptId);
        const indexMeta = await dbQueries.getScriptBlockIndexMeta(db, scriptId);
        const latestContentHash = latestMeta?.contentHash ?? '';

        const needsRebuild = !indexMeta
            || indexMeta.indexSchemaVersion !== SCRIPT_BLOCK_INDEX_SCHEMA_VERSION
            || indexMeta.status !== 'ready'
            || indexMeta.contentHash !== latestContentHash;

        if (!needsRebuild) {
            return;
        }

        await rebuildScriptBlockIndex(scriptId);
    };

    const getScriptBlockIndex = async (scriptId: string): Promise<ScriptBlockIndexSnapshot | null> => {
        const db = await getDb();
        const meta = await dbQueries.getScriptBlockIndexMeta(db, scriptId);

        if (!meta) {
            return null;
        }

        const rows = await dbQueries.listScriptBlockIndexRows(db, scriptId);

        return toSnapshotFromRows(rows);
    };

    return {
        getScriptBlockIndex,
        ensureScriptBlockIndex,
        rebuildScriptBlockIndex,
        rebuildScriptBlockIndexFromDocument,
        markScriptBlockIndexStale,
    };
};

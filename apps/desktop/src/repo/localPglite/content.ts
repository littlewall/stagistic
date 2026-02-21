import {dbQueries} from '@stagistic/db';
import {
    LATEST_SCRIPT_SCHEMA_VERSION,
    type ScriptDocument,
} from '@stagistic/script-core';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {
    computeContentHash,
    parseDocument,
    serializeDocument,
} from './documentCodec';
import type {
    GetDb,
    RecordOutbox,
} from './types';

type ContentHandlers = Pick<
    ScriptRepository,
    'loadLatest' | 'saveLatest' | 'loadVersion' | 'commitVersion' | 'restoreLatestFromVersion'
>;

interface CreateContentHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    blockIndex: {
        rebuildScriptBlockIndexFromDocument: (args: {
            scriptId: string,
            value: ScriptDocument,
            contentHash: string,
            updatedAt: number,
        }) => Promise<unknown>,
        markScriptBlockIndexStale: (scriptId: string, contentHash: string, error: unknown) => Promise<void>,
    },
}

export const createContentHandlers = ({
    getDb,
    recordOutbox,
    blockIndex,
}: CreateContentHandlersArgs): ContentHandlers => {
    const loadLatest: ContentHandlers['loadLatest'] = async scriptId => {
        const db = await getDb();
        const contentJson = await dbQueries.getLatestContent(db, scriptId);

        return contentJson ? parseDocument(contentJson) : null;
    };

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
        const db = await getDb();
        const now = Date.now();
        const contentJson = serializeDocument(value);
        const contentHash = computeContentHash(contentJson);
        const contentSize = contentJson.length;
        const latestMeta = await dbQueries.getLatestContentMeta(db, scriptId);
        const isRedundantWrite = latestMeta?.contentHash === contentHash
            && latestMeta.contentSize === contentSize;

        if (isRedundantWrite) {
            return;
        }

        await db.transaction(async tx => {
            await dbQueries.upsertLatest(tx, {
                scriptId,
                contentJson,
                contentHash,
                contentSize,
                updatedAt: now,
                schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
            });

            await dbQueries.updateScriptTimestamp(tx, {
                scriptId,
                updatedAt: now,
            });

            await recordOutbox({
                scriptId,
                opType: 'latest.save',
                payloadJson: JSON.stringify({scriptId, updatedAt: now}),
            }, tx);
        });

        try {
            await blockIndex.rebuildScriptBlockIndexFromDocument({
                scriptId,
                value,
                contentHash,
                updatedAt: now,
            });
        } catch (error) {
            console.error('Failed to rebuild script block index after saveLatest', error);
            await blockIndex.markScriptBlockIndexStale(scriptId, contentHash, error);
        }
    };

    const loadVersion: ContentHandlers['loadVersion'] = async versionId => {
        const db = await getDb();
        const contentJson = await dbQueries.getVersionContent(db, versionId);

        return contentJson ? parseDocument(contentJson) : null;
    };

    const commitVersion: ContentHandlers['commitVersion'] = async (scriptId, message) => {
        const db = await getDb();
        const latestContentJson = await dbQueries.getLatestContent(db, scriptId);

        if (!latestContentJson) {
            throw new Error('Cannot commit version without latest content');
        }

        const versionId = uuidv7();
        const now = Date.now();

        await dbQueries.insertVersion(db, {
            id: versionId,
            scriptId,
            message: message ?? null,
            contentJson: latestContentJson,
            createdAt: now,
            schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'version.commit',
            payloadJson: JSON.stringify({
                scriptId,
                versionId,
                createdAt: now,
            }),
        });

        return versionId;
    };

    const restoreLatestFromVersion: ContentHandlers['restoreLatestFromVersion'] = async (
        scriptId,
        versionId,
    ) => {
        const db = await getDb();
        const versionContentJson = await dbQueries.getVersionContent(db, versionId);

        if (!versionContentJson) {
            return;
        }

        const now = Date.now();
        const contentHash = computeContentHash(versionContentJson);
        const contentSize = versionContentJson.length;

        await db.transaction(async tx => {
            await dbQueries.upsertLatest(tx, {
                scriptId,
                contentJson: versionContentJson,
                contentHash,
                contentSize,
                updatedAt: now,
                schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
            });

            await dbQueries.updateScriptTimestamp(tx, {
                scriptId,
                updatedAt: now,
            });

            await recordOutbox({
                scriptId,
                opType: 'latest.restore-from-version',
                payloadJson: JSON.stringify({
                    scriptId,
                    versionId,
                    restoredAt: now,
                }),
            }, tx);
        });

        try {
            await blockIndex.rebuildScriptBlockIndexFromDocument({
                scriptId,
                value: parseDocument(versionContentJson),
                contentHash,
                updatedAt: now,
            });
        } catch (error) {
            console.error('Failed to rebuild script block index after restoreLatestFromVersion', error);
            await blockIndex.markScriptBlockIndexStale(scriptId, contentHash, error);
        }
    };

    return {
        loadLatest,
        saveLatest,
        loadVersion,
        commitVersion,
        restoreLatestFromVersion,
    };
};

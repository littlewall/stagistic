import {dbQueries, type ScriptSummary} from '@stagistic/db';
import type {SlateValue} from '@stagistic/shared';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {getLocalDb} from '~db';

const LATEST_SCHEMA_VERSION = 1;
const ENABLE_OUTBOX = false;

const serializeSlateValue = (value: SlateValue) => JSON.stringify(value);

const parseSlateValue = (value: string) => JSON.parse(value) as SlateValue;

export const createLocalPgliteRepository = (): ScriptRepository => {
    const dbPromise = getLocalDb();

    const getDb = async () => dbPromise;

    const recordOutbox = async (payload: {
        scriptId: string, opType: string, payloadJson: string,
    }) => {
        if (!ENABLE_OUTBOX) {
            return;
        }

        const db = await getDb();

        await dbQueries.insertOutbox(db, {
            id: uuidv7(),
            scriptId: payload.scriptId,
            opType: payload.opType,
            payloadJson: payload.payloadJson,
            createdAt: Date.now(),
            status: 'pending',
        });
    };

    const listScripts = async (options?: {limit?: number}): Promise<ScriptSummary[]> => {
        const db = await getDb();

        return dbQueries.listScripts(db, options);
    };

    const getScriptSummary = async (scriptId: string): Promise<ScriptSummary | null> => {
        const db = await getDb();

        return dbQueries.getScriptSummary(db, scriptId);
    };

    const createScript = async (title: string, initialContent?: SlateValue) => {
        const db = await getDb();
        const id = uuidv7();
        const now = Date.now();

        await dbQueries.insertScript(db, {
            id,
            title: title.trim() || 'Untitled script',
            createdAt: now,
            updatedAt: now,
        });

        if (initialContent) {
            await dbQueries.insertLatest(db, {
                scriptId: id,
                contentJson: serializeSlateValue(initialContent),
                updatedAt: now,
                schemaVersion: LATEST_SCHEMA_VERSION,
            });
        }

        return id;
    };

    const renameScript = async (scriptId: string, title: string) => {
        const db = await getDb();
        const now = Date.now();
        const nextTitle = title.trim() || 'Untitled script';

        await dbQueries.updateScriptTitle(db, {
            id: scriptId,
            title: nextTitle,
            updatedAt: now,
        });
    };

    const deleteScript = async (scriptId: string) => {
        const db = await getDb();

        await dbQueries.deleteScript(db, scriptId);
    };

    const setActiveBlock = async (scriptId: string, blockId: string | null) => {
        const db = await getDb();

        await dbQueries.updateActiveBlock(db, {
            scriptId,
            activeBlockId: blockId,
        });
    };

    const loadLatest = async (scriptId: string) => {
        const db = await getDb();
        const contentJson = await dbQueries.getLatestContent(db, scriptId);

        return contentJson ? parseSlateValue(contentJson) : null;
    };

    const saveLatest = async (scriptId: string, value: SlateValue) => {
        const db = await getDb();
        const now = Date.now();
        const contentJson = serializeSlateValue(value);

        await dbQueries.upsertLatest(db, {
            scriptId,
            contentJson,
            updatedAt: now,
            schemaVersion: LATEST_SCHEMA_VERSION,
        });

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'latest.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
        });
    };

    const loadVersion = async (versionId: string) => {
        const db = await getDb();
        const contentJson = await dbQueries.getVersionContent(db, versionId);

        return contentJson ? parseSlateValue(contentJson) : null;
    };

    const commitVersion = async (scriptId: string, message?: string) => {
        const db = await getDb();
        const latest = await loadLatest(scriptId);

        if (!latest) {
            throw new Error('Cannot commit version without latest content');
        }

        const versionId = uuidv7();
        const now = Date.now();

        await dbQueries.insertVersion(db, {
            id: versionId,
            scriptId,
            message: message ?? null,
            contentJson: serializeSlateValue(latest),
            createdAt: now,
            schemaVersion: LATEST_SCHEMA_VERSION,
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

    const restoreLatestFromVersion = async (scriptId: string, versionId: string) => {
        const version = await loadVersion(versionId);

        if (!version) {
            return;
        }

        await saveLatest(scriptId, version);
    };

    return {
        listScripts,
        getScriptSummary,
        createScript,
        renameScript,
        deleteScript,
        setActiveBlock,
        loadLatest,
        saveLatest,
        commitVersion,
        loadVersion,
        restoreLatestFromVersion,
    } satisfies ScriptRepository;
};

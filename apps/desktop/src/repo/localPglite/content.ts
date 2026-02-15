import {dbQueries} from '@stagistic/db';
import {
    LATEST_SCRIPT_SCHEMA_VERSION,
} from '@stagistic/script-core';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {
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

type CreateContentHandlersArgs = {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
};

export const createContentHandlers = ({
    getDb,
    recordOutbox,
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

        await dbQueries.upsertLatest(db, {
            scriptId,
            contentJson,
            updatedAt: now,
            schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
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

        await dbQueries.upsertLatest(db, {
            scriptId,
            contentJson: versionContentJson,
            updatedAt: now,
            schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
        });

        await dbQueries.updateScriptTimestamp(db, {
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
        });
    };

    return {
        loadLatest,
        saveLatest,
        loadVersion,
        commitVersion,
        restoreLatestFromVersion,
    };
};

import type {ScriptSummary} from '@stagistic/db';
import type {SlateValue} from '@stagistic/shared';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {loadLocalDb} from '~db';
import {ensureSchema} from '~db/migrations';

const LATEST_SCHEMA_VERSION = 1;
const ENABLE_OUTBOX = false;

type LocalDb = Awaited<ReturnType<typeof loadLocalDb>>;

type ScriptRow = {
    id: string,
    title: string,
    created_at: number,
    updated_at: number,
    active_block_id: string | null,
};

type LatestRow = {
    content_json: string,
};

type VersionRow = {
    content_json: string,
};

const serializeSlateValue = (value: SlateValue) => JSON.stringify(value);

const parseSlateValue = (value: string) => JSON.parse(value) as SlateValue;

export const createLocalSqliteRepository = (): ScriptRepository => {
    let dbPromise: Promise<LocalDb> | null = null;

    const getDb = async () => {
        if (!dbPromise) {
            dbPromise = (async () => {
                const db = await loadLocalDb();

                await ensureSchema(db);

                try {
                    const rows = await db.select<Array<{count: number}>>('SELECT COUNT(*) as count FROM scripts');
                    const count = rows[0]?.count ?? 0;

                    if (count === 0) {
                        const legacyDb = await loadLocalDb({path: 'sqlite:stagistic.db'});

                        await ensureSchema(legacyDb);

                        const legacyRows = await legacyDb.select<Array<{count: number}>>('SELECT COUNT(*) as count FROM scripts');
                        const legacyCount = legacyRows[0]?.count ?? 0;

                        console.info('SQLite legacy scripts count', legacyCount);

                        if (legacyCount > 0) {
                            console.warn('Using legacy SQLite database location for existing scripts.');

                            return legacyDb;
                        }
                    }
                } catch (error) {
                    console.warn('Failed to check legacy SQLite database', error);
                }

                return db;
            })();
        }

        return dbPromise;
    };

    const recordOutbox = async (db: LocalDb, payload: {
        scriptId: string, opType: string, payloadJson: string,
    }) => {
        if (!ENABLE_OUTBOX) {
            return;
        }

        await db.execute(
            `INSERT INTO sync_outbox (id, script_id, op_type, payload_json, created_at, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [
                uuidv7(),
                payload.scriptId,
                payload.opType,
                payload.payloadJson,
                Date.now(),
            ],
        );
    };

    const listScripts = async (): Promise<ScriptSummary[]> => {
        const db = await getDb();
        const rows = await db.select<ScriptRow[]>(
            'SELECT id, title, created_at, updated_at, active_block_id FROM scripts ORDER BY updated_at DESC',
        );

        return rows.map(row => ({
            id: row.id,
            title: row.title,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            activeBlockId: row.active_block_id ?? null,
        }));
    };

    const createScript = async (title: string, initialContent?: SlateValue) => {
        const db = await getDb();
        const id = uuidv7();
        const now = Date.now();

        await db.execute(
            'INSERT INTO scripts (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [
                id,
                title.trim() || 'Untitled script',
                now,
                now,
            ],
        );

        if (initialContent) {
            await db.execute(
                `INSERT INTO script_latest (script_id, content_json, updated_at, schema_version)
                 VALUES (?, ?, ?, ?)`,
                [
                    id,
                    serializeSlateValue(initialContent),
                    now,
                    LATEST_SCHEMA_VERSION,
                ],
            );
        }

        return id;
    };

    const renameScript = async (scriptId: string, title: string) => {
        const db = await getDb();
        const now = Date.now();
        const nextTitle = title.trim() || 'Untitled script';

        await db.execute(
            'UPDATE scripts SET title = ?, updated_at = ? WHERE id = ?',
            [
                nextTitle,
                now,
                scriptId,
            ],
        );
    };

    const deleteScript = async (scriptId: string) => {
        const db = await getDb();

        await db.execute('DELETE FROM scripts WHERE id = ?', [scriptId]);
    };

    const setActiveBlock = async (scriptId: string, blockId: string | null) => {
        const db = await getDb();

        await db.execute(
            'UPDATE scripts SET active_block_id = ? WHERE id = ?',
            [blockId, scriptId],
        );
    };

    const loadLatest = async (scriptId: string) => {
        const db = await getDb();
        const rows = await db.select<LatestRow[]>(
            'SELECT content_json FROM script_latest WHERE script_id = ? LIMIT 1',
            [scriptId],
        );

        if (!rows.length) {
            return null;
        }

        return parseSlateValue(rows[0].content_json);
    };

    const saveLatest = async (scriptId: string, value: SlateValue) => {
        const db = await getDb();
        const now = Date.now();

        await db.execute(
            `INSERT INTO script_latest (script_id, content_json, updated_at, schema_version)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(script_id) DO UPDATE SET
               content_json = excluded.content_json,
               updated_at = excluded.updated_at,
               schema_version = excluded.schema_version`,
            [
                scriptId,
                serializeSlateValue(value),
                now,
                LATEST_SCHEMA_VERSION,
            ],
        );

        await db.execute(
            'UPDATE scripts SET updated_at = ? WHERE id = ?',
            [now, scriptId],
        );

        await recordOutbox(db, {
            scriptId,
            opType: 'latest.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
        });
    };

    const loadVersion = async (versionId: string) => {
        const db = await getDb();
        const rows = await db.select<VersionRow[]>(
            'SELECT content_json FROM script_versions WHERE id = ? LIMIT 1',
            [versionId],
        );

        if (!rows.length) {
            return null;
        }

        return parseSlateValue(rows[0].content_json);
    };

    const commitVersion = async (scriptId: string, message?: string) => {
        const db = await getDb();
        const latest = await loadLatest(scriptId);

        if (!latest) {
            throw new Error('Cannot commit version without latest content');
        }

        const versionId = uuidv7();
        const now = Date.now();

        await db.execute(
            `INSERT INTO script_versions (id, script_id, message, content_json, created_at, schema_version)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                versionId,
                scriptId,
                message ?? null,
                serializeSlateValue(latest),
                now,
                LATEST_SCHEMA_VERSION,
            ],
        );

        await db.execute(
            'UPDATE scripts SET updated_at = ? WHERE id = ?',
            [now, scriptId],
        );

        await recordOutbox(db, {
            scriptId,
            opType: 'version.commit',
            payloadJson: JSON.stringify({
                scriptId, versionId, createdAt: now,
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

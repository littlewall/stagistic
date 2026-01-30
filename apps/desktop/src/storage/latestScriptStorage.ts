import {
    LATEST_SCRIPT_KEY,
    LATEST_SCRIPT_SCHEMA_VERSION,
    type LatestScriptStorage,
    type SlateValue,
} from '@stagistic/shared';

import {loadLocalDb} from '~db';

const TABLE_NAME = 'scripts_latest';

type LocalDb = Awaited<ReturnType<typeof loadLocalDb>>;

const ensureLatestScriptsTable = async (db: LocalDb) => {
    await db.execute(
        `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      key TEXT PRIMARY KEY,
      content_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT ${LATEST_SCRIPT_SCHEMA_VERSION}
    );`,
    );
};

export const serializeSlateValue = (value: SlateValue) => JSON.stringify(value);

export const parseSlateValue = (json: string) => JSON.parse(json) as SlateValue;

/*
 * Phase 1: single default script latest state (local-only).
 * Next: multiple scripts/projects + import/export, and remote cloud adapters.
 */
export const createSqliteLatestScriptStorage = (): LatestScriptStorage => {
    return {
        async loadLatestScript() {
            try {
                const db = await loadLocalDb();

                await ensureLatestScriptsTable(db);

                const rows = await db.select<{content_json: string}[]>(
                    `SELECT content_json FROM ${TABLE_NAME} WHERE key = ? LIMIT 1`,
                    [LATEST_SCRIPT_KEY],
                );

                if (!rows.length) return null;

                return parseSlateValue(rows[0].content_json);
            } catch (error) {
                console.error('Failed to load latest script from SQLite', error);

                return null;
            }
        },
        async saveLatestScript(value) {
            try {
                const db = await loadLocalDb();

                await ensureLatestScriptsTable(db);

                const contentJson = serializeSlateValue(value);
                const updatedAt = Date.now();

                await db.execute(
                    `INSERT INTO ${TABLE_NAME} (key, content_json, updated_at, schema_version)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             content_json = excluded.content_json,
             updated_at = excluded.updated_at,
             schema_version = excluded.schema_version`,
                    [
                        LATEST_SCRIPT_KEY,
                        contentJson,
                        updatedAt,
                        LATEST_SCRIPT_SCHEMA_VERSION,
                    ],
                );
            } catch (error) {
                console.error('Failed to save latest script to SQLite', error);
            }
        },
        async clearLatestScript() {
            try {
                const db = await loadLocalDb();

                await ensureLatestScriptsTable(db);
                await db.execute(`DELETE FROM ${TABLE_NAME} WHERE key = ?`, [LATEST_SCRIPT_KEY]);
            } catch (error) {
                console.error('Failed to clear latest script in SQLite', error);
            }
        },
    };
};

export const latestScriptStorage = createSqliteLatestScriptStorage();

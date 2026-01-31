import type Database from '@tauri-apps/plugin-sql';

const MIGRATIONS: string[] = [
    'PRAGMA foreign_keys = ON;',
    `CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        active_block_id TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS script_latest (
        script_id TEXT PRIMARY KEY,
        content_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS script_versions (
        id TEXT PRIMARY KEY,
        script_id TEXT NOT NULL,
        message TEXT NULL,
        content_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS script_versions_script_id_created_at_idx ON script_versions (script_id, created_at DESC);',
    `CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        script_id TEXT,
        op_type TEXT,
        payload_json TEXT,
        created_at INTEGER,
        status TEXT NOT NULL DEFAULT 'pending'
    );`,
];

const ensureScriptsColumns = async (db: Database) => {
    const columns = await db.select<Array<{name: string}>>(
        'PRAGMA table_info(scripts);',
    );
    const hasActiveBlock = columns.some(column => column.name === 'active_block_id');

    if (!hasActiveBlock) {
        await db.execute('ALTER TABLE scripts ADD COLUMN active_block_id TEXT;');
    }
};

export const ensureSchema = async (db: Database) => {
    for (const sql of MIGRATIONS) {
        await db.execute(sql);
    }

    await ensureScriptsColumns(db);
};

import type {Pool} from 'pg';

import {IDENTITY_SCHEMA} from './database';
import {IDENTITY_MIGRATIONS} from './migrations';

export interface SqlMigration {
    id: string,
    sql: string,
}

/**
 * Applies pending SQL migrations in order, once, under an advisory lock (safe
 * when several instances start together). Applied ids live in `table`.
 */
export const runSqlMigrations = async (pool: Pool, table: string, migrations: readonly SqlMigration[]) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [table]);
        await client.query(`CREATE TABLE IF NOT EXISTS "${table}" (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

        const applied = new Set((await client.query<{id: string}>(`SELECT id FROM "${table}"`)).rows.map(row => row.id));
        const pending = migrations.filter(migration => !applied.has(migration.id));

        for (const migration of pending) {
            await client.query(migration.sql);
            await client.query(`INSERT INTO "${table}" (id) VALUES ($1)`, [migration.id]);
        }

        await client.query('COMMIT');

        return pending.map(migration => migration.id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/** Creates the pool's schema (see `createIdentityPool`) and applies identity migrations. */
export const runIdentityMigrations = async (pool: Pool, schema = IDENTITY_SCHEMA) => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

    return runSqlMigrations(pool, 'identity_migrations', IDENTITY_MIGRATIONS);
};

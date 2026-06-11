import type {PGlite} from '@electric-sql/pglite';

import {compiledMigrations} from '../migrations.compiled';

const MIGRATIONS_TABLE = '__stagistic_migrations';

const ensureMigrationsTable = async (client: PGlite) => {
    await client.exec(
        `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (`
        + 'id text PRIMARY KEY,'
        + 'applied_at bigint NOT NULL'
        + ');',
    );
};

const getAppliedMigrationIds = async (client: PGlite) => {
    const result = await client.query<{id: string}>(
        `SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id`,
    );

    return new Set(result.rows.map((row: {id: string}) => row.id));
};

export const runPgliteMigrations = async (client: PGlite) => {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrationIds(client);

    for (const migration of compiledMigrations) {
        if (applied.has(migration.id)) {
            continue;
        }

        const safeId = migration.id.replace(/'/gu, '\'\'');

        try {
            /*
             * Run the migration SQL and the tracking INSERT inside a single
             * exec() call. Wrapping in BEGIN/COMMIT means PGlite treats the
             * whole block as one transaction — if anything fails, the ROLLBACK
             * that follows leaves the DB clean and the migration un-marked.
             *
             * Note: DDL in PGlite is transactional (PostgreSQL 16 semantics),
             * so ALTER TABLE / CREATE INDEX roll back correctly on failure.
             */
            await client.exec(
                `BEGIN;\n${migration.sql}\n`
                + `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES ('${safeId}', ${Date.now()});\n`
                + 'COMMIT;',
            );
        } catch (error) {
            console.error(`[db] Migration ${migration.id} failed:`, error);

            try {
                await client.exec('ROLLBACK;');
            } catch (rollbackError) {
                console.warn('[db] Failed to rollback migration', rollbackError);
            }

            throw error;
        }
    }
};

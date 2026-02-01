import type {PGlite} from '@electric-sql/pglite';
import {compiledMigrations} from '@stagistic/db';

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

    return new Set(result.rows.map(row => row.id));
};

export const runMigrations = async (client: PGlite) => {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrationIds(client);

    for (const migration of compiledMigrations) {
        if (applied.has(migration.id)) {
            continue;
        }

        const safeId = migration.id.replace(/'/gu, '\'\'');

        try {
            await client.exec(
                `BEGIN;\n${migration.sql}\n`
                + `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES ('${safeId}', ${Date.now()});\n`
                + 'COMMIT;',
            );
        } catch (error) {
            try {
                await client.exec('ROLLBACK;');
            } catch (rollbackError) {
                console.warn('Failed to rollback migration', rollbackError);
            }

            throw error;
        }
    }
};

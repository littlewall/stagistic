import type {PGlite} from '@electric-sql/pglite';

import {compiledMigrations} from '../migrations.compiled';

const MIGRATIONS_TABLE = '__stagistic_migrations';
const MIGRATIONS_LOCK = `LOCK TABLE ${MIGRATIONS_TABLE} IN EXCLUSIVE MODE;`;

/*
 * A dev build briefly compiled 0014 with bigint and persisted this checksum
 * before 0014 was restored. 0015 performs the real schema change, so this
 * known ledger value can be normalized safely. All other mismatches fail.
 */
const LEGACY_CHECKSUMS: Readonly<Record<string, readonly string[]>> = {
    '0014_add_script_attachments': ['d7d194c2771be944c1b2e78e631a7fea0ea836be13a8aedf4bc538ff53315a80'],
};

type MigrationClient = Pick<PGlite, 'exec' | 'query'>;

interface AppliedMigration {
    id: string,
    checksum: string | null,
}

const ensureMigrationsTable = async (client: PGlite) => {
    await client.exec(
        `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (`
        + 'id text PRIMARY KEY,'
        + 'applied_at bigint NOT NULL,'
        + 'checksum text'
        + ');',
    );

    await client.exec(
        `ALTER TABLE ${MIGRATIONS_TABLE} ADD COLUMN IF NOT EXISTS checksum text;`,
    );
};

const getAppliedMigrations = async (client: MigrationClient) => {
    const result = await client.query<AppliedMigration>(
        `SELECT id, checksum FROM ${MIGRATIONS_TABLE} ORDER BY id`,
    );

    return result.rows;
};

const isKnownLegacyChecksum = (migration: AppliedMigration) => {
    if (!migration.checksum) {
        return false;
    }

    return LEGACY_CHECKSUMS[migration.id]?.includes(migration.checksum) ?? false;
};

const assertMigrationHistory = (appliedMigrations: AppliedMigration[]) => {
    const compiledById = new Map<string, typeof compiledMigrations[number]>(
        compiledMigrations.map(migration => [migration.id, migration]),
    );

    for (const appliedMigration of appliedMigrations) {
        const compiledMigration = compiledById.get(appliedMigration.id);

        if (!compiledMigration) {
            throw new Error(
                `Database migration ${appliedMigration.id} is newer than this app. Update the app before opening this database.`,
            );
        }

        if (
            !appliedMigration.checksum
            || appliedMigration.checksum === compiledMigration.checksum
            || isKnownLegacyChecksum(appliedMigration)
        ) {
            continue;
        }

        throw new Error(
            `Migration ${appliedMigration.id} checksum mismatch. Historical migrations are immutable; add a new migration instead.`,
        );
    }
};

const prepareMigrationHistory = async (client: PGlite) => {
    await client.transaction(async tx => {
        await tx.exec(MIGRATIONS_LOCK);

        const appliedMigrations = await getAppliedMigrations(tx);

        assertMigrationHistory(appliedMigrations);

        const compiledById = new Map<string, typeof compiledMigrations[number]>(
            compiledMigrations.map(migration => [migration.id, migration]),
        );

        for (const appliedMigration of appliedMigrations) {
            const migration = compiledById.get(appliedMigration.id);

            if (!migration) {
                throw new Error(`Missing compiled migration ${appliedMigration.id}.`);
            }

            if (appliedMigration.checksum === migration.checksum) {
                continue;
            }

            await tx.query(
                `UPDATE ${MIGRATIONS_TABLE} SET checksum = $1 WHERE id = $2`,
                [migration.checksum, appliedMigration.id],
            );
        }

        await tx.exec(
            `ALTER TABLE ${MIGRATIONS_TABLE} ALTER COLUMN checksum SET NOT NULL;`,
        );
    });
};

const applyMigration = async (client: PGlite, migration: typeof compiledMigrations[number]) => {
    await client.transaction(async tx => {
        await tx.exec(MIGRATIONS_LOCK);

        const appliedMigrations = await getAppliedMigrations(tx);

        assertMigrationHistory(appliedMigrations);

        if (appliedMigrations.some(applied => applied.id === migration.id)) {
            return;
        }

        await tx.exec(migration.sql);
        await tx.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at, checksum) VALUES ($1, $2, $3)`,
            [
                migration.id,
                Date.now(),
                migration.checksum,
            ],
        );
    });
};

export const runPgliteMigrations = async (client: PGlite) => {
    await ensureMigrationsTable(client);
    await prepareMigrationHistory(client);

    for (const migration of compiledMigrations) {
        try {
            await applyMigration(client, migration);
        } catch (error) {
            console.error(`[db] Migration ${migration.id} failed.`);
            throw error;
        }
    }
};

import {PGlite} from '@electric-sql/pglite';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import {compiledMigrations} from '../migrations.compiled';
import {runPgliteMigrations} from './migrations';

const clients: PGlite[] = [];

const createClient = async () => {
    const client = await PGlite.create();

    clients.push(client);

    return client;
};

afterEach(async () => {
    await Promise.all(clients.splice(0).map(client => client.close()));
});

describe('runPgliteMigrations', () => {
    it('applies each migration once and records its checksum', async () => {
        const client = await createClient();

        await runPgliteMigrations(client);
        await runPgliteMigrations(client);

        const result = await client.query<{id: string, checksum: string}>(
            'SELECT id, checksum FROM __stagistic_migrations ORDER BY id',
        );

        expect(result.rows).toEqual(compiledMigrations.map(migration => ({
            id: migration.id,
            checksum: migration.checksum,
        })));
    });

    it('upgrades legacy migration tracking rows without checksums', async () => {
        const client = await createClient();
        const firstMigration = compiledMigrations[0];

        await client.exec(
            'CREATE TABLE __stagistic_migrations ('
            + 'id text PRIMARY KEY, applied_at bigint NOT NULL);',
        );
        await client.exec(firstMigration.sql);
        await client.query(
            'INSERT INTO __stagistic_migrations (id, applied_at) VALUES ($1, $2)',
            [firstMigration.id, Date.now()],
        );

        await runPgliteMigrations(client);

        const result = await client.query<{id: string, checksum: string}>(
            'SELECT id, checksum FROM __stagistic_migrations ORDER BY id',
        );

        expect(result.rows).toEqual(compiledMigrations.map(migration => ({
            id: migration.id,
            checksum: migration.checksum,
        })));
    });

    it('rejects a modified migration that was already applied', async () => {
        const client = await createClient();
        const migration = compiledMigrations.at(-1);

        expect(migration).toBeDefined();

        await runPgliteMigrations(client);
        await client.query(
            'UPDATE __stagistic_migrations SET checksum = $1 WHERE id = $2',
            ['modified', migration?.id],
        );

        await expect(runPgliteMigrations(client)).rejects.toThrow('checksum mismatch');
    });

    it('rejects a database migrated by a newer app', async () => {
        const client = await createClient();

        await runPgliteMigrations(client);
        await client.query(
            `INSERT INTO __stagistic_migrations (id, applied_at, checksum)
             VALUES ($1, $2, $3)`,
            [
                '9999_future_migration',
                Date.now(),
                'future',
            ],
        );

        await expect(runPgliteMigrations(client)).rejects.toThrow('newer than this app');
    });

    it('repairs the integer sort_order left by the old 0014 migration', async () => {
        const client = await createClient();

        await runPgliteMigrations(client);
        await client.exec(
            `INSERT INTO scripts (id, title, created_at, updated_at)
                VALUES ('script-1', 'Test', 1, 1);
             INSERT INTO script_cues (id, script_id, created_at, updated_at)
                VALUES ('cue-1', 'script-1', 1, 1);
             INSERT INTO script_attachments (
                id, script_id, filename, mime_type, size_bytes, storage_key, created_at, updated_at
             ) VALUES ('attachment-1', 'script-1', 'test.pdf', 'application/pdf', 1, 'file-1', 1, 1);
             INSERT INTO script_cue_attachments (cue_id, attachment_id, sort_order, created_at)
                VALUES ('cue-1', 'attachment-1', 42, 1);
             ALTER TABLE script_cue_attachments
                ALTER COLUMN sort_order TYPE integer USING sort_order::integer;
             UPDATE __stagistic_migrations
                SET checksum = 'd7d194c2771be944c1b2e78e631a7fea0ea836be13a8aedf4bc538ff53315a80'
                WHERE id = '0014_add_script_attachments';
             DELETE FROM __stagistic_migrations WHERE id = '0015_widen_attachment_sort_order';`,
        );

        await runPgliteMigrations(client);

        const typeResult = await client.query<{dataType: string}>(
            `SELECT data_type AS "dataType" FROM information_schema.columns
             WHERE table_name = 'script_cue_attachments' AND column_name = 'sort_order'`,
        );

        expect(typeResult.rows[0]?.dataType).toBe('bigint');

        const historyResult = await client.query<{checksum: string}>(
            `SELECT checksum FROM __stagistic_migrations
             WHERE id = '0014_add_script_attachments'`,
        );
        const canonicalMigration = compiledMigrations.find(
            migration => migration.id === '0014_add_script_attachments',
        );

        expect(historyResult.rows[0]?.checksum).toBe(canonicalMigration?.checksum);

        const timestamp = Date.now();

        await client.query(
            'UPDATE script_cue_attachments SET sort_order = $1 WHERE cue_id = $2',
            [timestamp, 'cue-1'],
        );

        const valueResult = await client.query<{sortOrder: string}>(
            `SELECT sort_order::text AS "sortOrder" FROM script_cue_attachments
             WHERE cue_id = 'cue-1'`,
        );

        expect(valueResult.rows[0]?.sortOrder).toBe(String(timestamp));
    });

    it('promotes the newest legacy cue attachment without deleting duplicates', async () => {
        const client = await createClient();
        const roleMigration = compiledMigrations.find(
            migration => migration.id === '0016_add_cue_attachment_roles',
        );

        expect(roleMigration).toBeDefined();

        await client.exec(
            'CREATE TABLE __stagistic_migrations ('
            + 'id text PRIMARY KEY, applied_at bigint NOT NULL, checksum text NOT NULL);',
        );

        for (const migration of compiledMigrations.filter(candidate => candidate !== roleMigration)) {
            await client.exec(migration.sql);
            await client.query(
                `INSERT INTO __stagistic_migrations (id, applied_at, checksum)
                 VALUES ($1, $2, $3)`,
                [
                    migration.id,
                    Date.now(),
                    migration.checksum,
                ],
            );
        }

        await client.exec(
            `INSERT INTO scripts (id, title, created_at, updated_at)
                VALUES ('script-1', 'Test', 1, 1);
             INSERT INTO script_cues (id, script_id, created_at, updated_at)
                VALUES ('cue-1', 'script-1', 1, 1);
             INSERT INTO script_attachments (
                id, script_id, filename, mime_type, size_bytes, storage_key, created_at, updated_at
             ) VALUES
                ('attachment-1', 'script-1', 'old.pdf', 'application/pdf', 1, 'file-1', 1, 1),
                ('attachment-2', 'script-1', 'new.pdf', 'application/pdf', 1, 'file-2', 2, 2);
             INSERT INTO script_cue_attachments (cue_id, attachment_id, sort_order, created_at)
                VALUES
                    ('cue-1', 'attachment-1', 1, 1),
                    ('cue-1', 'attachment-2', 2, 2);`,
        );

        await runPgliteMigrations(client);

        const result = await client.query<{attachmentId: string, role: string}>(
            `SELECT attachment_id AS "attachmentId", role
             FROM script_cue_attachments
             WHERE cue_id = 'cue-1'
             ORDER BY attachment_id`,
        );

        expect(result.rows).toEqual([
            {
                attachmentId: 'attachment-1',
                role: 'legacy_attachment:attachment-1',
            }, {
                attachmentId: 'attachment-2',
                role: 'integrated_score',
            },
        ]);

        await client.exec(
            `INSERT INTO script_attachments (
                id, script_id, filename, mime_type, size_bytes, storage_key, created_at, updated_at
             ) VALUES ('attachment-3', 'script-1', 'duplicate.pdf', 'application/pdf', 1, 'file-3', 3, 3);`,
        );

        await expect(client.exec(
            `INSERT INTO script_cue_attachments (
                cue_id, attachment_id, role, sort_order, created_at
             ) VALUES ('cue-1', 'attachment-3', 'integrated_score', 3, 3);`,
        )).rejects.toThrow('script_cue_attachments_cue_role_unique_idx');
    });
});

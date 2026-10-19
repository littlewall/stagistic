import {PGlite} from '@electric-sql/pglite';
import type {ScriptSummaryMetadata} from '@stagistic/script';
import {
    expect,
    it,
} from 'vite-plus/test';

import {compiledMigrations} from './migrations.compiled';

it('backfills legacy structure from ordered blocks with unknown pages', async () => {
    const client = await PGlite.create();

    try {
        const targetIndex = compiledMigrations.findIndex(migration => migration.id === '0024_script_summary_metadata');

        expect(targetIndex).toBeGreaterThan(-1);
        for (const migration of compiledMigrations.slice(0, targetIndex)) {
            await client.exec(migration.sql);
        }

        await client.exec(`
            INSERT INTO scripts (id, title, created_at, updated_at)
            VALUES ('empty', 'Empty', 1, 1), ('no-acts', 'No acts', 1, 1), ('acts', 'Acts', 1, 1);
            INSERT INTO script_blocks (id, script_id, block_type, block_order, created_at, updated_at)
            VALUES
                ('n1', 'no-acts', 'scene', 'a0', 1, 1),
                ('n2', 'no-acts', 'scene', 'a1', 1, 1),
                ('s0', 'acts', 'scene', 'a0', 1, 1),
                ('a1', 'acts', 'act', 'a1', 1, 1),
                ('a2', 'acts', 'act', 'a2', 1, 1),
                ('s1', 'acts', 'scene', 'a3', 1, 1),
                ('a3', 'acts', 'act', 'a4', 1, 1);
        `);
        await client.exec(compiledMigrations[targetIndex].sql);

        const result = await client.query<{id: string, metadata: ScriptSummaryMetadata}>(
            'SELECT id, summary_metadata AS metadata FROM scripts ORDER BY id',
        );

        expect(result.rows).toEqual([
            {
                id: 'acts',
                metadata: {
                    pageCount: null,
                    sceneCount: 2,
                    actSceneCounts: [
                        0,
                        1,
                        0,
                    ],
                    unassignedSceneCount: 1,
                },
            },
            {
                id: 'empty',
                metadata: {
                    pageCount: null,
                    sceneCount: 0,
                    actSceneCounts: [],
                    unassignedSceneCount: 0,
                },
            },
            {
                id: 'no-acts',
                metadata: {
                    pageCount: null,
                    sceneCount: 2,
                    actSceneCounts: [],
                    unassignedSceneCount: 2,
                },
            },
        ]);
    } finally {
        await client.close();
    }
});

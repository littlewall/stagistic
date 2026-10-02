/// <reference types="node" />

import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {PGlite} from '@electric-sql/pglite';
import {buildScriptSummaryMetadata, type ScriptDocument} from '@stagistic/script';
import {drizzle} from 'drizzle-orm/pglite';
import {
    expect,
    it,
} from 'vite-plus/test';

import {runPgliteMigrations} from '../pglite/migrations';
import {dbSchema} from '../schema';
import {InMemoryFileStorage} from '../storage/fileStorage';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

const repositoryFor = (client: PGlite) => {
    const db = drizzle({client, schema: dbSchema});

    return createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => client.syncToFs(),
        fileStorage: new InMemoryFileStorage(),
    });
};

it('reopens a filesystem database with the same saved document and summary metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stagistic-summary-'));
    let client: PGlite | undefined;

    try {
        client = await PGlite.create({dataDir: directory});
        await runPgliteMigrations(client);

        const repository = repositoryFor(client);
        const value: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'act',
                    attrs: {id: 'act-1'},
                    content: [],
                },
                {
                    type: 'scene',
                    attrs: {id: 'scene-1'},
                    content: [],
                },
            ],
        };
        const scriptId = await repository.createScript('Persistent', value);
        const metadata = buildScriptSummaryMetadata(value, 6);

        await repository.saveLatest(scriptId, value, metadata);
        await client.close();
        client = await PGlite.create({dataDir: directory});
        await runPgliteMigrations(client);

        const reopened = repositoryFor(client);

        expect((await reopened.getScriptSummary(scriptId))?.summaryMetadata).toEqual(metadata);
        expect((await reopened.loadLatest(scriptId))?.content.map(node => node.type)).toEqual(['act', 'scene']);
    } finally {
        await client?.close();
        await rm(directory, {recursive: true, force: true});
    }
});

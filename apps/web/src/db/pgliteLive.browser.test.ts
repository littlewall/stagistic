import {
    createLocalPgliteRepository,
    dbQueries,
    InMemoryFileStorage,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    getLocalDb,
    syncToFs,
} from './index';

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 10_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for worker-backed PGlite change');
        }

        await new Promise(resolve => setTimeout(resolve, 20));
    }
};

describe('worker-backed PGlite live queries', () => {
    it('delivers committed changes and tears the subscription down', async () => {
        const db = await getLocalDb();
        const repository = createLocalPgliteRepository({
            getLocalDb,
            syncToFs,
            fileStorage: new InMemoryFileStorage(),
        });
        const scriptId = `worker-live-${crypto.randomUUID()}`;
        const snapshots: string[][] = [];
        const unsubscribe = await repository.scriptSummaries.subscribe(rows => {
            snapshots.push(rows.map(row => row.id));
        });

        await dbQueries.insertScript(db, {
            id: scriptId,
            title: 'Worker live test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        await waitFor(() => snapshots.some(rows => rows.includes(scriptId)));

        unsubscribe();

        const snapshotCount = snapshots.length;

        await dbQueries.deleteScript(db, scriptId);
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(snapshots).toHaveLength(snapshotCount);
    });

    it('saves and flushes a feature-length document within budget', async () => {
        let syncDurationMs = 0;
        const measuredSyncToFs = async () => {
            const startedAt = performance.now();

            await syncToFs();
            syncDurationMs = performance.now() - startedAt;
        };
        const repository = createLocalPgliteRepository({
            getLocalDb,
            syncToFs: measuredSyncToFs,
            fileStorage: new InMemoryFileStorage(),
        });
        const scriptId = `worker-save-${crypto.randomUUID()}`;
        const document = {
            type: 'doc' as const,
            content: Array.from({length: 400}, (_, index) => ({
                type: 'stageDirection' as const,
                attrs: {id: `block-${index}`},
                content: [{type: 'text' as const, text: `Line ${index}`}],
            })),
        };

        await repository.createScriptWithId({
            id: scriptId,
            title: 'Performance test',
        });

        try {
            const startedAt = performance.now();

            await repository.saveLatest(scriptId, document);

            const totalDurationMs = performance.now() - startedAt;

            expect(totalDurationMs).toBeLessThan(2_000);
            expect(syncDurationMs).toBeLessThan(1_000);
        } finally {
            await repository.deleteScript(scriptId);
        }
    });
});

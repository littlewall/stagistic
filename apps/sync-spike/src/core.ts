/*
 * Phase 0 spike core: Hocuspocus (no auth) persisting Y docs to Postgres,
 * shared by the Bun and Node entries. Two persistence strategies are measured:
 * - full:        onStoreDocument upserts the full encoded state (extension-database)
 * - incremental: every update is appended; load merges, store compacts
 *
 * GET /metrics returns RSS/CPU, load/store timings and DB write volume.
 */
import {Database} from '@hocuspocus/extension-database';
import {Hocuspocus} from '@hocuspocus/server';
import * as Y from 'yjs';

import {createDb} from './db';
import {createHistogram} from './histogram';

export const PORT = Number(process.env.PORT ?? 1234);
export const STRATEGY = (process.env.PERSISTENCE ?? 'full') as 'full' | 'incremental';
export const PER_MESSAGE_DEFLATE = process.env.PER_MESSAGE_DEFLATE === '1';

const DEBOUNCE_MS = Number(process.env.STORE_DEBOUNCE_MS ?? 2_000);

const db = createDb(process.env.DATABASE_URL ?? 'postgres://stagistic:stagistic@localhost:5432/sync_spike', Number(process.env.DB_POOL ?? 8));

await db.migrate();

export const metrics = {
    loads: createHistogram(),
    stores: createHistogram(),
    appends: createHistogram(),
    dbWrites: 0,
    dbWriteBytes: 0,
    connectionsOpen: 0,
    documentsLoaded: 0,
    cpuStart: process.cpuUsage(),
    wallStart: performance.now(),
};

export const resetMetrics = () => {
    metrics.loads.reset();
    metrics.stores.reset();
    metrics.appends.reset();
    metrics.dbWrites = 0;
    metrics.dbWriteBytes = 0;
    metrics.cpuStart = process.cpuUsage();
    metrics.wallStart = performance.now();
};

const timed = async <T>(histogram: ReturnType<typeof createHistogram>, task: () => Promise<T>) => {
    const start = performance.now();

    try {
        return await task();
    } finally {
        histogram.record(performance.now() - start);
    }
};

const fullPersistence = new Database({
    fetch: ({documentName}) => timed(metrics.loads, () => db.loadState(documentName)),
    store: ({documentName, state}) => timed(metrics.stores, async () => {
        metrics.dbWrites++;
        metrics.dbWriteBytes += state.byteLength;
        await db.storeState(documentName, state);
    }),
});

const incrementalPersistence = {
    async onLoadDocument({documentName, document}: {documentName: string, document: Y.Doc}) {
        await timed(metrics.loads, async () => {
            const update = await db.loadMerged(documentName);

            if (update) {
                Y.applyUpdate(document, update);
            }
        });
    },
    async onChange({documentName, update}: {documentName: string, update: Uint8Array}) {
        await timed(metrics.appends, async () => {
            metrics.dbWrites++;
            metrics.dbWriteBytes += update.byteLength;
            await db.appendUpdate(documentName, update);
        });
    },
    async onStoreDocument({documentName, document}: {documentName: string, document: Y.Doc}) {
        await timed(metrics.stores, () => db.compact(documentName, Y.encodeStateAsUpdate(document)));
    },
};

export const hocuspocus = new Hocuspocus({
    name: 'sync-spike',
    debounce: DEBOUNCE_MS,
    maxDebounce: DEBOUNCE_MS * 5,
    unloadImmediately: true,
    quiet: true,
    extensions: [STRATEGY === 'full' ? fullPersistence : incrementalPersistence],
    afterLoadDocument: () => {
        metrics.documentsLoaded++;

        return Promise.resolve();
    },
    afterUnloadDocument: () => {
        metrics.documentsLoaded--;

        return Promise.resolve();
    },
});

export const snapshot = async () => {
    const cpu = process.cpuUsage(metrics.cpuStart);
    const wallMs = performance.now() - metrics.wallStart;

    return {
        runtime: typeof Bun === 'undefined' ? 'node' : 'bun',
        strategy: STRATEGY,
        perMessageDeflate: PER_MESSAGE_DEFLATE,
        rssMb: process.memoryUsage().rss / 1024 / 1024,
        heapUsedMb: process.memoryUsage().heapUsed / 1024 / 1024,
        cpuPercent: ((cpu.user + cpu.system) / 1000 / wallMs) * 100,
        wallMs,
        connectionsOpen: metrics.connectionsOpen,
        documentsLoaded: metrics.documentsLoaded,
        loadMs: metrics.loads.summary(),
        storeMs: metrics.stores.summary(),
        appendMs: metrics.appends.summary(),
        dbWrites: metrics.dbWrites,
        dbWriteBytes: metrics.dbWriteBytes,
        db: await db.stats(),
    };
};

export const collectGarbage = () => {
    if (typeof Bun !== 'undefined') {
        Bun.gc(true);
    } else {
        (globalThis as {gc?: () => void}).gc?.();
    }
};

import {PGlite} from '@electric-sql/pglite';
import {live} from '@electric-sql/pglite/live';
import {worker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createScriptBodyProjectionStore} from '@stagistic/db';
import {createLocalDb, runPgliteMigrations} from '@stagistic/db/pglite';
import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {createIndexeddbDocPersistence, createSyncEngine} from '@stagistic/sync-engine';

/*
 * `init` runs only in the leader worker (PGlite elects it with Web Locks), so
 * the sync engine below has exactly one instance per browser profile. A new
 * leader starts its own engine; tabs re-open their scripts on `engine-started`.
 */
const startSyncEngine = (db: PGlite) => {
    const localDb = createLocalDb(db);

    createSyncEngine({
        store: createScriptBodyProjectionStore({
            getDb: () => Promise.resolve(localDb),
            syncDb: () => db.syncToFs(),
        }),
        persistence: createIndexeddbDocPersistence(),
        clientSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
    });
};

void worker({
    async init(options) {
        const dataDir = options.dataDir ?? 'idb://stagistic-main';

        const [fsBundleResponse, wasmResponse] = await Promise.all([fetch(pgliteDataUrl), fetch(pgliteWasmUrl)]);

        if (!fsBundleResponse.ok) {
            throw new Error(`Failed to load PGlite fs bundle (${fsBundleResponse.status})`);
        }

        if (!wasmResponse.ok) {
            throw new Error(`Failed to load PGlite wasm (${wasmResponse.status})`);
        }

        const fsBundle = await fsBundleResponse.blob();
        const wasmBytes = await wasmResponse.arrayBuffer();
        const wasmModule = await WebAssembly.compile(wasmBytes);

        const db = await PGlite.create({
            dataDir,
            extensions: {live},
            fsBundle,
            wasmModule,
            relaxedDurability: options.relaxedDurability ?? true,
        });

        await runPgliteMigrations(db);
        startSyncEngine(db);

        return db;
    },
});

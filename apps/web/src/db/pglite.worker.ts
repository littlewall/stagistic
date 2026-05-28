import {PGlite} from '@electric-sql/pglite';
import {worker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {runPgliteMigrations} from '@stagistic/db/pglite';

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
            fsBundle,
            wasmModule,
        });

        await runPgliteMigrations(db);

        return db;
    },
});

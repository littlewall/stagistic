import {worker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createPgliteWorkerDb} from '@stagistic/db/pglite';

void worker({
    init: options => createPgliteWorkerDb({
        dataDir: options.dataDir,
        relaxedDurability: options.relaxedDurability,
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
    }),
});

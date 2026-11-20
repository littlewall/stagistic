import {worker} from '@electric-sql/pglite/worker';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createPgliteWorkerDb} from '@stagistic/db/pglite';

// Waits for leadership like the real worker, then fails to fetch its files, as a tab gone offline would.
void worker({
    init: options => createPgliteWorkerDb({
        dataDir: options.dataDir,
        relaxedDurability: options.relaxedDurability,
        fsBundleUrl: '/stagistic-missing-file.data',
        wasmUrl: pgliteWasmUrl,
        report: message => postMessage(message),
    }),
});

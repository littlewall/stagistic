import {worker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createPgliteWorkerDb, createPortPremigrationBackupStore} from '@stagistic/db/pglite';

// Desktop uses IndexedDB because OPFS is unreliable in macOS WKWebView.
void worker({
    init: options => createPgliteWorkerDb({
        dataDir: options.dataDir,
        relaxedDurability: options.relaxedDurability,
        premigrationBackup: true,
        // The page writes the dump to the app data folder; this worker has no file access.
        premigrationBackupStore: createPortPremigrationBackupStore({
            post: (message, transfer) => postMessage(message, {transfer}),
            listen: handler => {
                const onMessage = (event: MessageEvent) => handler(event.data);

                addEventListener('message', onMessage);

                return () => removeEventListener('message', onMessage);
            },
        }),
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
        report: message => postMessage(message),
    }),
});

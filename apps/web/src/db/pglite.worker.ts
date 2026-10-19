import {worker} from '@electric-sql/pglite/worker';
import pgliteDataUrl from '@pglite-data?url';
import pgliteWasmUrl from '@pglite-wasm?url';
import {createPgliteWorkerDb} from '@stagistic/db/pglite';

import {cloudConfig} from '../cloud/cloudConfig';
import {IndexedDbFileStorage} from './fileStorage';

void worker({
    init: options => createPgliteWorkerDb({
        dataDir: options.dataDir,
        relaxedDurability: options.relaxedDurability,
        fsBundleUrl: pgliteDataUrl,
        wasmUrl: pgliteWasmUrl,
    }, {cloud: cloudConfig ?? undefined, files: new IndexedDbFileStorage()}),
});

import {
    createLocalPgliteRepository,
    type ScriptRepository,
    withDocumentSync,
} from '@stagistic/db';
import {createSyncEngineClient} from '@stagistic/sync-engine';

import {getLocalDb, syncToFs} from '~db';
import {IndexedDbFileStorage} from '~db/fileStorage';

/** Tab side of the sync engine running in the PGlite leader worker. */
export const documentSync = createSyncEngineClient();

/** Local repository whose script content and records are mirrored into Y.Docs. */
export const scriptRepository: ScriptRepository = withDocumentSync(createLocalPgliteRepository({
    getLocalDb,
    syncToFs,
    fileStorage: new IndexedDbFileStorage(),
}), {getDb: getLocalDb, documents: documentSync});
export type {ScriptRepository} from '@stagistic/db';

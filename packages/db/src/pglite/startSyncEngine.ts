import type {PGlite} from '@electric-sql/pglite';
import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {createIndexeddbDocPersistence, createSyncEngine} from '@stagistic/sync-engine';

import {createScriptProjectionStore} from '../repo/document/projectionStore';
import {createLocalDb} from './bootstrap';

/**
 * Starts the local sync engine on the leader's PGlite. Call from the worker's
 * `init` (runs only in the leader, elected with Web Locks), so there is exactly
 * one engine per browser profile; a new leader starts its own and tabs re-open
 * their scripts on `engine-started`.
 */
export const startPgliteSyncEngine = (client: PGlite) => {
    const localDb = createLocalDb(client);

    return createSyncEngine({
        store: createScriptProjectionStore({
            getDb: () => Promise.resolve(localDb),
            syncDb: () => client.syncToFs(),
        }),
        persistence: createIndexeddbDocPersistence(),
        clientSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
    });
};

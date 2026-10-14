import type {PGlite} from '@electric-sql/pglite';
import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {
    type AttachmentFiles,
    createIndexeddbDocPersistence,
    createSyncEngine,
} from '@stagistic/sync-engine';

import {createScriptProjectionStore} from '../repo/document/projectionStore';
import {createCloudSyncStore} from '../repo/sync/cloudSyncStore';
import {createLocalDb} from './bootstrap';

/**
 * Starts the local sync engine on the leader's PGlite. Call from the worker's
 * `init` (runs only in the leader, elected with Web Locks), so there is exactly
 * one engine per browser profile; a new leader starts its own and tabs re-open
 * their scripts on `engine-started`.
 */
export interface CloudEndpoints {
    /** `https://auth.api.stagistic.app` */
    authUrl: string,
    /** `https://sync.api.stagistic.app` (REST); WebSocket at `wss://…/ws`. */
    syncUrl: string,
}

export const startPgliteSyncEngine = (client: PGlite, {cloud, files}: {cloud?: CloudEndpoints, files?: AttachmentFiles} = {}) => {
    const localDb = createLocalDb(client);
    const getDb = () => Promise.resolve(localDb);
    const syncDb = () => client.syncToFs();

    return createSyncEngine({
        store: createScriptProjectionStore({getDb, syncDb}),
        ...cloud
            ? {
                cloud: {
                    authUrl: cloud.authUrl,
                    syncUrl: cloud.syncUrl,
                    wsUrl: `${cloud.syncUrl.replace(/^http/, 'ws')}/ws`,
                    store: createCloudSyncStore({getDb, syncDb}),
                    files,
                },
            }
            : {},
        persistence: createIndexeddbDocPersistence(),
        clientSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
    });
};

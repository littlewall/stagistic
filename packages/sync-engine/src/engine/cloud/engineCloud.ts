import type * as Y from 'yjs';

import type {CloudAction, EngineMessage} from '../protocol';
import {
    type CloudSync,
    type CloudSyncConfig,
    createCloudSync,
} from './cloudSync';
import type {CloudStatus, DocKind} from './types';

/*
 * The engine's side of cloud sync: exposes its docs, projection and tab
 * bookkeeping to `createCloudSync` (the `CloudEngineHost`).
 */

export const createEngineCloud = ({
    config,
    log,
    getDocs,
    flush,
    unload,
    dropLocalState,
    tabRefs,
    post,
}: {
    config: CloudSyncConfig,
    log: (message: string, error?: unknown) => void,
    getDocs: (scriptId: string, seed: boolean) => Promise<Record<DocKind, Y.Doc>>,
    flush: (scriptId: string) => Promise<void>,
    unload: (scriptId: string) => Promise<void>,
    /** Disposes docs and clears stored Y state (projection kept). */
    dropLocalState: (scriptId: string) => Promise<void>,
    tabRefs: Map<string, number>,
    post: (message: EngineMessage) => void,
}): CloudSync => {
    const cloud = createCloudSync({
        config,
        log,
        host: {
            getDocs: (scriptId, {seed}) => getDocs(scriptId, seed),
            flush,
            unload,
            resetScript: dropLocalState,
            deleteLocal: async scriptId => {
                await dropLocalState(scriptId);
                await config.store.deleteScript(scriptId);
            },
            isOpenInTab: scriptId => (tabRefs.get(scriptId) ?? 0) > 0,
            openScripts: () => [...tabRefs.keys()],
            publishStatus: status => post({type: 'cloud-status', status}),
            notifyReset: scriptIds => {
            // Tabs drop these replicas unreleased and re-open them.
                scriptIds.forEach(scriptId => tabRefs.delete(scriptId));
                post({type: 'scripts-reset', scriptIds});
            },
        },
    });

    // Back online (worker or window): hints sent meanwhile are lost, catch up once.
    globalThis.addEventListener?.('online', () => cloud.wake());

    return cloud;
};

const SIGNED_OUT: CloudStatus = {
    state: 'signed-out',
    email: null,
    pending: 0,
    lastSyncedAt: null,
    error: null,
};

/** Control-channel `cloud` request; a local-only engine is always signed out. */
export const runCloudAction = async (cloud: CloudSync | null, action: CloudAction): Promise<unknown> => {
    if (!cloud) {
        return SIGNED_OUT;
    }

    const actions: Record<CloudAction, () => Promise<unknown>> = {
        status: () => Promise.resolve(cloud.status()),
        'signed-in': async () => {
            await cloud.signedIn();

            return cloud.status();
        },
        'signed-out': async () => {
            await cloud.signedOut();

            return cloud.status();
        },
        check: () => cloud.check(),
        wake: () => {
            cloud.wake();

            return Promise.resolve(cloud.status());
        },
    };

    return actions[action]();
};

import * as Y from 'yjs';

import {createAccessTokenSource} from './accessToken';
import {CloudUnauthorizedError, createCloudApi} from './cloudApi';
import {createCloudEvents, eventsDocumentName} from './cloudEvents';
import {createCloudReconcile} from './cloudReconcile';
import type {
    CloudContext,
    CloudEngineHost,
    CloudSync,
    CloudSyncConfig,
} from './contracts';
import {createCloudSocket, type DocConnection} from './docConnection';
import {createSingleFlight} from './singleFlight';
import {documentNameOf, encodeStateVectors} from './stateVectors';
import {deleteInCloud, syncLibrary} from './syncLibrary';
import {
    type CloudAccount,
    type CloudStatus,
    DOC_KINDS,
    type DocKind,
} from './types';

export type {
    CloudContext,
    CloudEngineHost,
    CloudSync,
    CloudSyncConfig,
} from './contracts';

/*
 * Cloud sync of the leader engine. Signed out: nothing connects. After a sign-in
 * that this device has not checked yet, nothing connects either until the tab
 * ran the check (`check` + `apply`, cloudReconcile.ts). Then the engine is live:
 * - scripts open in a tab stay attached to Hocuspocus (real-time merge)
 * - the rest of the library syncs in the background: compare state vectors
 *   with the last sync, attach, wait until idle, record, detach and unload
 */

export const createCloudSync = ({
    config,
    host,
    log,
}: {
    config: CloudSyncConfig,
    host: CloudEngineHost,
    log: (message: string, error?: unknown) => void,
}): CloudSync => {
    const {store} = config;
    const tokens = createAccessTokenSource({authUrl: config.authUrl, fetch: config.fetch});
    const api = createCloudApi({
        syncUrl: config.syncUrl,
        tokens,
        fetch: config.fetch,
    });
    const socket = createCloudSocket({
        wsUrl: config.wsUrl,
        tokens,
        WebSocketPolyfill: config.WebSocketPolyfill,
        onStatus: state => {
            if (state === 'disconnected') {
                wasDisconnected = true;
                setStatus({state: 'offline'});

                return;
            }

            // Hints sent while the socket was down are lost: catch up once.
            if (wasDisconnected && live) {
                wasDisconnected = false;
                void runSyncAll();
            }
        },
    });
    const connections = new Map<string, DocConnection[]>();
    const running = new Map<string, Promise<void>>();
    const dirty = new Set<string>();
    let account: CloudAccount | null = null;
    let live = false;
    let initialScanDone = false;
    let wasDisconnected = false;
    let eventsConnection: DocConnection | null = null;
    let dirtyTimer: ReturnType<typeof setTimeout> | null = null;
    let currentStatus: CloudStatus = {
        state: 'signed-out',
        email: null,
        pending: 0,
        lastSyncedAt: null,
        error: null,
    };

    const setStatus = (patch: Partial<CloudStatus>) => {
        currentStatus = {...currentStatus, ...patch};
        host.publishStatus(currentStatus);
    };

    const attach = (scriptId: string, docs: Record<DocKind, Y.Doc>) => {
        if (!connections.has(scriptId)) {
            connections.set(scriptId, DOC_KINDS.map(kind => socket.attach(documentNameOf(scriptId, kind), docs[kind])));
        }
    };

    const detach = (scriptId: string) => {
        connections.get(scriptId)?.forEach(connection => connection.destroy());
        connections.delete(scriptId);
    };

    /** Attaches, waits until both sides are merged and acknowledged, records the sync. */
    const syncScript: CloudContext['syncScript'] = (scriptId, {seed}) => {
        const previous = running.get(scriptId) ?? Promise.resolve();
        const next = previous.catch(() => {}).then(async () => {
            const current = account;

            if (!current) {
                return;
            }

            const docs = await host.getDocs(scriptId, {seed});

            dirty.delete(scriptId);
            attach(scriptId, docs);
            await Promise.all(connections.get(scriptId)!.map(connection => connection.idle()));
            await store.setSyncState({
                scriptId,
                accountId: current.accountId,
                stateVectors: encodeStateVectors(docs),
                syncedAt: Date.now(),
            });

            if (!host.isOpenInTab(scriptId)) {
                detach(scriptId);
                await host.flush(scriptId);
                await host.unload(scriptId);
            }
        });

        running.set(scriptId, next);

        return next.finally(() => {
            if (running.get(scriptId) === next) {
                running.delete(scriptId);
            }
        });
    };

    const upload: CloudContext['upload'] = async (scriptId, title) => {
        await api.register(scriptId, title);
        await syncScript(scriptId, {seed: true});
    };

    const download: CloudContext['download'] = async script => {
        // Create the (empty, unseeded) docs before the row exists, so a tab opening it cannot seed.
        await host.getDocs(script.id, {seed: false});
        await store.createScriptShell(script.id, script.title);
        await syncScript(script.id, {seed: false});
        await host.flush(script.id);
    };

    const handleError = (error: unknown) => {
        if (error instanceof CloudUnauthorizedError) {
            void signedOut();

            return;
        }

        log('cloud sync failed', error);
        setStatus({state: 'error', error: String(error)});
    };

    /** One pass over the library (live only). */
    const syncAll = async () => {
        if (!live || !account) {
            return;
        }

        await syncLibrary({
            accountId: account.accountId,
            store,
            api,
            host,
            dirty,
            initialScanDone,
            isAttached: scriptId => connections.has(scriptId),
            syncScript,
            upload,
            download,
            setStatus,
        });
        initialScanDone = true;
    };

    const libraryPasses = createSingleFlight(() => syncAll().catch(handleError));
    const runSyncAll = libraryPasses.run;

    const events = createCloudEvents({
        store,
        isAttached: scriptId => connections.has(scriptId),
        syncScript,
        libraryPass: libraryPasses.soon,
        onError: handleError,
        pullIntervalMs: config.pullIntervalMs,
    });

    const goLive: CloudContext['goLive'] = async () => {
        live = true;
        setStatus({state: 'syncing', email: account?.email ?? null});

        for (const scriptId of host.openScripts()) {
            attach(scriptId, await host.getDocs(scriptId, {seed: true}));
        }

        if (account && !eventsConnection) {
            // Change hints replace polling; the pass below covers everything before them.
            eventsConnection = socket.attach(eventsDocumentName(account.accountId), new Y.Doc(), {onStateless: events.handle});
        }

        await runSyncAll();
    };

    const disconnect = () => {
        live = false;
        eventsConnection?.destroy();
        eventsConnection = null;
        events.stop();
        libraryPasses.cancel();

        [...connections.keys()].forEach(detach);
        socket.close();
    };

    const start: CloudSync['start'] = async () => {
        let token: string | null;

        try {
            token = await tokens.get({force: true});
        } catch (error) {
            log('could not reach the auth service', error);
            setStatus({state: 'offline'});

            return;
        }

        const claims = tokens.claims();

        if (!token || !claims) {
            setStatus({state: 'signed-out', email: null});

            return;
        }

        const stored = await store.getAccount();

        if (stored && stored.accountId === claims.accountId && stored.checked) {
            account = stored;
            await goLive();

            return;
        }

        // A sign-in this device has not checked yet: connect nothing until the check ran.
        account = {
            accountId: claims.accountId,
            email: claims.email,
            checked: false,
        };
        await store.setAccount(account);
        setStatus({state: 'needs-check', email: claims.email});
    };

    const signedOut: CloudSync['signedOut'] = async () => {
        disconnect();
        tokens.clear();
        account = null;
        initialScanDone = false;
        await store.clearAccount();
        setStatus({
            state: 'signed-out',
            email: null,
            pending: 0,
            error: null,
        });
    };

    const reconcile = createCloudReconcile({
        store,
        api,
        socket,
        tokens,
        host,
        account: () => account,
        syncScript,
        download,
        upload,
        goLive: async () => {
            account = {...account!, checked: true};
            await store.setAccount(account);
            await goLive();
        },
        setStatus,
    });

    return {
        start,
        signedIn: async () => {
            disconnect();
            await start();
        },
        signedOut,
        status: () => currentStatus,
        check: () => reconcile.check(),
        apply: resolutions => reconcile.apply(resolutions),
        wake: () => {
            if (live) {
                void runSyncAll();
            }
        },
        tabOpened: scriptId => {
            if (live) {
                void host.getDocs(scriptId, {seed: true}).then(docs => attach(scriptId, docs)).catch(handleError);
            }
        },
        tabReleased: scriptId => {
            if (live && connections.has(scriptId) && !host.isOpenInTab(scriptId)) {
                void syncScript(scriptId, {seed: true}).catch(handleError);
            }
        },
        // Attached scripts stream on their own; others (repository mutations) sync shortly after.
        localChange: scriptId => {
            if (!live || connections.has(scriptId)) {
                return;
            }

            dirty.add(scriptId);

            if (dirtyTimer) {
                clearTimeout(dirtyTimer);
            }

            dirtyTimer = setTimeout(() => {
                dirtyTimer = null;
                [...dirty].forEach(id => void syncScript(id, {seed: true}).catch(handleError));
            }, 1_000);
        },
        scriptDeleted: async scriptId => {
            detach(scriptId);
            await deleteInCloud({
                scriptId,
                store,
                api,
                accountId: account?.accountId ?? null,
                live,
            });
        },
        stop: async () => {
            disconnect();
            await Promise.allSettled(running.values());
        },
    };
};

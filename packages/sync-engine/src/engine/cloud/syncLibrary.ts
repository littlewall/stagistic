import type {CloudApi} from './cloudApi';
import type {CloudContext, CloudEngineHost} from './cloudSync';
import {cloudChangedSince, localChangedSince} from './stateVectors';
import type {CloudSyncStore} from './types';

/*
 * One live pass over the library: settle tombstones, then sync every script
 * whose local or cloud docs moved since its last sync (state vectors), upload
 * new local scripts, download new cloud ones, apply cloud deletions.
 */
export const syncLibrary = async ({
    accountId,
    store,
    api,
    host,
    dirty,
    initialScanDone,
    isAttached,
    syncScript,
    upload,
    download,
    setStatus,
}: {
    accountId: string,
    store: CloudSyncStore,
    api: CloudApi,
    host: CloudEngineHost,
    dirty: Set<string>,
    /** False on the first pass after start: local docs are loaded once to find offline edits. */
    initialScanDone: boolean,
    isAttached: (scriptId: string) => boolean,
    syncScript: CloudContext['syncScript'],
    upload: CloudContext['upload'],
    download: CloudContext['download'],
    setStatus: CloudContext['setStatus'],
}) => {
    setStatus({state: 'syncing', error: null});

    const {scripts: cloud} = await api.list();
    const cloudById = new Map(cloud.map(script => [script.id, script]));
    const local = await store.listLocalScripts();
    const localIds = new Set(local.map(script => script.scriptId));
    const states = new Map((await store.listSyncStates()).map(state => [state.scriptId, state]));

    for (const tombstone of await store.listTombstones()) {
        if (tombstone.accountId === accountId) {
            const remote = cloudById.get(tombstone.scriptId);

            if (remote && remote.deletedAt === null) {
                await api.remove(tombstone.scriptId);
            }

            await store.removeTombstone(tombstone.scriptId);
        }
    }

    for (const script of local) {
        const state = states.get(script.scriptId);

        if (state && state.accountId !== accountId) {
            continue;
        }

        const remote = cloudById.get(script.scriptId);

        if (!remote) {
            await upload(script.scriptId, script.title);
            continue;
        }

        // Local edits made before this engine started are found once by loading the docs.
        const changedHere = dirty.has(script.scriptId)
            || !state
            || (!initialScanDone && localChangedSince(await host.getDocs(script.scriptId, {seed: true}), state));

        if (remote.deletedAt !== null) {
            if (changedHere) {
                await upload(script.scriptId, script.title);
            } else {
                await host.deleteLocal(script.scriptId);
                await store.clearSyncState(script.scriptId);
            }

            continue;
        }

        if (changedHere || cloudChangedSince(remote, state) || isAttached(script.scriptId)) {
            await syncScript(script.scriptId, {seed: true});
        } else if (!host.isOpenInTab(script.scriptId)) {
            await host.unload(script.scriptId);
        }
    }

    for (const remote of cloud) {
        if (!localIds.has(remote.id) && remote.deletedAt === null && !states.has(remote.id)) {
            await download(remote);
        }
    }

    setStatus({
        state: 'synced',
        pending: dirty.size,
        lastSyncedAt: Date.now(),
    });
};

/** A script deleted on this device: delete it in the cloud now, or later (tombstone). */
export const deleteInCloud = async ({
    scriptId,
    store,
    api,
    accountId,
    live,
}: {
    scriptId: string,
    store: CloudSyncStore,
    api: CloudApi,
    accountId: string | null,
    live: boolean,
}) => {
    const state = (await store.listSyncStates()).find(item => item.scriptId === scriptId);

    await store.clearSyncState(scriptId);

    if (!state || state.accountId !== accountId) {
        return;
    }

    try {
        if (!live) {
            throw new Error('not connected');
        }

        await api.remove(scriptId);
    } catch {
        // Deleted offline or signed out: the next live pass (or check) deletes it in the cloud.
        await store.addTombstone(scriptId, state.accountId);
    }
};

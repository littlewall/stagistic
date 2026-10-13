import {uuidv7} from '@stagistic/shared';
import * as Y from 'yjs';

import {
    classifyScripts,
    pickNewerSide,
    type ScriptSyncPlan,
} from '../../conflicts/classify';
import {replaceOnCloudState} from '../../conflicts/replaceOnCloudState';
import {countDifferingScenes} from '../../conflicts/sceneDiff';
import {bodyDocToScriptDocument, replaceBodyContent} from '../../ydoc/bodyCodec';
import {readRecords, replaceRecords} from '../../ydoc/recordsCodec';
import {RECORD_COLLECTIONS} from '../scriptRecords';
import type {CloudContext} from './cloudSync';
import {
    cloudChangedSince,
    documentNameOf,
    localChangedSince,
} from './stateVectors';
import {
    type CloudCheckReport,
    type CloudConflict,
    type CloudScript,
    type ConflictResolution,
    DOC_KINDS,
    type DocKind,
} from './types';

/*
 * Post-sign-in check (plan "Návrat po odhlášení"): classify every script by
 * state vectors against the last sync, resolve everything automatically except
 * scripts changed on both sides, which the user decides in the tab's dialog.
 * Conflicting scripts are compared with a scratch copy of the cloud state that
 * is never merged into the local docs.
 */

export const COPY_SUFFIX = ' (copy from this device)';

interface PendingCheck {
    plan: ScriptSyncPlan,
    cloudById: Map<string, CloudScript>,
    titles: Map<string, string>,
    /** Cloud state of conflicting scripts, unmerged. */
    scratch: Map<string, Record<DocKind, Y.Doc>>,
    conflicts: CloudConflict[],
}

export const createCloudReconcile = (context: CloudContext) => {
    const {
        store,
        api,
        socket,
        host,
    } = context;
    let pending: PendingCheck | null = null;

    /** Downloads the cloud docs of a script into fresh docs, without touching local state. */
    const fetchCloudState = async (scriptId: string) => {
        const docs = {
            body: new Y.Doc(),
            meta: new Y.Doc(),
            comments: new Y.Doc(),
        };
        const connections = DOC_KINDS.map(kind => socket.attach(documentNameOf(scriptId, kind), docs[kind]));

        try {
            await Promise.all(connections.map(connection => connection.idle()));
        } finally {
            connections.forEach(connection => connection.destroy());
        }

        return docs;
    };

    const check = async (): Promise<CloudCheckReport> => {
        const account = context.account();

        if (!account) {
            throw new Error('[sync-engine] cloud check without a signed-in account');
        }

        context.setStatus({state: 'checking'});

        const {scripts: cloud, clockOffsetMs} = await api.list();
        const cloudById = new Map(cloud.map(script => [script.id, script]));
        const local = await store.listLocalScripts();
        const states = new Map((await store.listSyncStates()).map(state => [state.scriptId, state]));
        const localInfo = [];

        for (const script of local) {
            const state = states.get(script.scriptId);
            const docs = await host.getDocs(script.scriptId, {seed: true});

            localInfo.push({
                scriptId: script.scriptId,
                boundAccountId: state?.accountId ?? null,
                changedSinceSync: localChangedSince(docs, state),
            });

            if (!host.isOpenInTab(script.scriptId)) {
                await host.unload(script.scriptId);
            }
        }

        const plan = classifyScripts({
            accountId: account.accountId,
            local: localInfo,
            tombstones: (await store.listTombstones()).map(tombstone => ({scriptId: tombstone.scriptId, boundAccountId: tombstone.accountId})),
            cloud: cloud.map(script => ({
                scriptId: script.id,
                changedSinceSync: cloudChangedSince(script, states.get(script.id)),
                deletedAt: script.deletedAt ? Date.parse(script.deletedAt) : null,
            })),
        });
        const titles = new Map(local.map(script => [script.scriptId, script.title]));
        const scratch = new Map<string, Record<DocKind, Y.Doc>>();
        const conflicts: CloudConflict[] = [];

        for (const scriptId of plan.conflicts) {
            const remote = cloudById.get(scriptId)!;
            const localScript = local.find(script => script.scriptId === scriptId)!;
            const cloudDocs = await fetchCloudState(scriptId);
            const localDocs = await host.getDocs(scriptId, {seed: true});
            const cloudUpdatedAt = Date.parse(remote.updatedAt);

            scratch.set(scriptId, cloudDocs);
            conflicts.push({
                scriptId,
                title: localScript.title || remote.title,
                differingScenes: countDifferingScenes(bodyDocToScriptDocument(localDocs.body), bodyDocToScriptDocument(cloudDocs.body)),
                localUpdatedAt: localScript.updatedAt,
                cloudUpdatedAt,
                newer: pickNewerSide(localScript.updatedAt, cloudUpdatedAt, clockOffsetMs),
            });
        }

        pending = {
            plan,
            cloudById,
            titles,
            scratch,
            conflicts,
        };
        context.setStatus({state: 'needs-check'});

        return {
            email: account.email,
            upload: plan.upload.length + plan.restoreCloud.length,
            download: plan.download.length + plan.restoreLocal.length,
            delete: plan.deleteCloud.length + plan.deleteLocal.length,
            restore: plan.restoreCloud.length + plan.restoreLocal.length,
            conflicts,
        };
    };

    /** "Use newer", local side newer: replace on the cloud state as ordinary ops (invariant 8). */
    const replaceCloudWithLocal = async (scriptId: string, cloudDocs: Record<DocKind, Y.Doc>) => {
        const localDocs = await host.getDocs(scriptId, {seed: true});
        const body = bodyDocToScriptDocument(localDocs.body);
        const meta = readRecords(localDocs.meta, RECORD_COLLECTIONS.meta);
        const comments = readRecords(localDocs.comments, RECORD_COLLECTIONS.comments);
        const replaced = {
            body: replaceOnCloudState(Y.encodeStateAsUpdate(cloudDocs.body), doc => replaceBodyContent(doc, body)).doc,
            meta: replaceOnCloudState(Y.encodeStateAsUpdate(cloudDocs.meta), doc => replaceRecords(doc, meta, RECORD_COLLECTIONS.meta)).doc,
            comments: replaceOnCloudState(Y.encodeStateAsUpdate(cloudDocs.comments), doc => replaceRecords(doc, comments, RECORD_COLLECTIONS.comments)).doc,
        };

        await host.resetScript(scriptId);

        const fresh = await host.getDocs(scriptId, {seed: false});

        for (const kind of DOC_KINDS) {
            Y.applyUpdate(fresh[kind], Y.encodeStateAsUpdate(replaced[kind]));
        }

        await context.syncScript(scriptId, {seed: false});
        await host.flush(scriptId);
    };

    const replaceLocalWithCloud = async (script: CloudScript) => {
        await host.resetScript(script.id);
        await context.download(script);
    };

    const resolveConflict = async (conflict: CloudConflict, resolution: ConflictResolution, remote: CloudScript, cloudDocs: Record<DocKind, Y.Doc>) => {
        if (resolution === 'keep-both') {
            // The local version becomes a new script; the original follows the cloud.
            const copyId = uuidv7();

            await host.flush(conflict.scriptId);
            await store.duplicateScript(conflict.scriptId, copyId, `${conflict.title}${COPY_SUFFIX}`);
            await replaceLocalWithCloud(remote);
            await context.upload(copyId, `${conflict.title}${COPY_SUFFIX}`);
        } else if (conflict.newer === 'cloud') {
            await replaceLocalWithCloud(remote);
        } else {
            await replaceCloudWithLocal(conflict.scriptId, cloudDocs);
        }
    };

    const apply = async (resolutions: Record<string, ConflictResolution>) => {
        if (!pending) {
            throw new Error('[sync-engine] cloud apply without a check');
        }

        const {
            plan,
            cloudById,
            titles,
            scratch,
            conflicts,
        } = pending;

        pending = null;
        context.setStatus({state: 'syncing'});

        for (const scriptId of [...plan.upload, ...plan.restoreCloud]) {
            await context.upload(scriptId, titles.get(scriptId) ?? '');
        }

        for (const scriptId of [...plan.download, ...plan.restoreLocal]) {
            await context.download(cloudById.get(scriptId)!);
            await store.removeTombstone(scriptId);
        }

        for (const scriptId of plan.deleteCloud) {
            await api.remove(scriptId);
            await store.removeTombstone(scriptId);
        }

        for (const scriptId of plan.deleteLocal) {
            await host.deleteLocal(scriptId);
            await store.clearSyncState(scriptId);
        }

        for (const conflict of conflicts) {
            await resolveConflict(conflict, resolutions[conflict.scriptId] ?? 'keep-both', cloudById.get(conflict.scriptId)!, scratch.get(conflict.scriptId)!);
            scratch.get(conflict.scriptId)!.body.destroy();
        }

        if (conflicts.length > 0) {
            host.notifyReset(conflicts.map(conflict => conflict.scriptId));
        }

        await context.goLive();
    };

    return {check, apply};
};

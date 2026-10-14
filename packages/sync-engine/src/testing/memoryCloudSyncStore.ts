import type {
    CloudAccount,
    CloudSyncStore,
    LocalTombstoneRecord,
    SyncedScriptState,
} from '../engine/cloud/types';
import type {createMemoryProjectionStore} from './memoryProjectionStore';

/** In-memory `CloudSyncStore` over a memory projection (stands in for PGlite). */
export const createMemoryCloudSyncStore = (projection: ReturnType<typeof createMemoryProjectionStore>) => {
    let account: CloudAccount | null = null;
    const titles = new Map<string, string>();
    const updatedAt = new Map<string, number>();
    const states = new Map<string, SyncedScriptState>();
    const tombstones = new Map<string, LocalTombstoneRecord>();
    const uploaded = new Set<string>();
    const attachmentsOf = (scriptId: string) => Object.entries(projection.readRecordsOf(scriptId, 'meta').attachments ?? {});

    const store: CloudSyncStore = {
        getAccount: () => Promise.resolve(account),
        setAccount: next => {
            account = {...next};

            return Promise.resolve();
        },
        clearAccount: () => {
            account = null;

            return Promise.resolve();
        },
        listLocalScripts: () => Promise.resolve([...new Set([...projection.documents.keys(), ...titles.keys()])].map(scriptId => ({
            scriptId,
            title: titles.get(scriptId) ?? scriptId,
            updatedAt: updatedAt.get(scriptId) ?? 0,
        }))),
        listSyncStates: () => Promise.resolve([...states.values()].map(state => structuredClone(state))),
        setSyncState: state => {
            states.set(state.scriptId, structuredClone(state));

            return Promise.resolve();
        },
        clearSyncState: scriptId => {
            states.delete(scriptId);

            return Promise.resolve();
        },
        listTombstones: () => Promise.resolve([...tombstones.values()]),
        addTombstone: (scriptId, accountId) => {
            tombstones.set(scriptId, {
                scriptId,
                accountId,
                deletedAt: Date.now(),
            });

            return Promise.resolve();
        },
        removeTombstone: scriptId => {
            tombstones.delete(scriptId);

            return Promise.resolve();
        },
        createScriptShell: (scriptId, title) => {
            titles.set(scriptId, title);

            return Promise.resolve();
        },
        duplicateScript: (sourceScriptId, targetScriptId, title) => {
            const document = projection.documents.get(sourceScriptId);

            if (document) {
                projection.documents.set(targetScriptId, structuredClone(document));
            }

            projection.setRecords(targetScriptId, 'meta', projection.readRecordsOf(sourceScriptId, 'meta'));
            projection.setRecords(targetScriptId, 'comments', projection.readRecordsOf(sourceScriptId, 'comments'));
            titles.set(targetScriptId, title);

            return Promise.resolve();
        },
        listPendingUploads: scriptId => Promise.resolve(attachmentsOf(scriptId)
            .filter(([id]) => !uploaded.has(id))
            .map(([attachmentId, fields]) => ({
                attachmentId,
                storageKey: String(fields.storageKey),
                mimeType: String(fields.mimeType),
                sizeBytes: Number(fields.sizeBytes),
            }))),
        markAttachmentUploaded: attachmentId => {
            uploaded.add(attachmentId);

            return Promise.resolve();
        },
        findAttachment: storageKey => {
            for (const scriptId of projection.documents.keys()) {
                const found = attachmentsOf(scriptId).find(([, fields]) => fields.storageKey === storageKey);

                if (found) {
                    return Promise.resolve({
                        attachmentId: found[0],
                        scriptId,
                        sha256: typeof found[1].sha256 === 'string' ? found[1].sha256 : null,
                    });
                }
            }

            return Promise.resolve(null);
        },
        deleteScript: scriptId => {
            projection.documents.delete(scriptId);
            titles.delete(scriptId);

            return Promise.resolve();
        },
    };

    return {
        store,
        titles,
        states,
        tombstones,
        uploaded,
        /** Local edit time of a script (drives "newer" in conflicts). */
        touch: (scriptId: string, at = Date.now()) => updatedAt.set(scriptId, at),
        account: () => account,
    };
};

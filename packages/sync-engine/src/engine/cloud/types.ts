/*
 * Cloud sync: types shared by the engine (leader worker), its store (PGlite,
 * `@stagistic/db`) and tabs.
 */

export type DocKind = 'body' | 'meta' | 'comments';

export const DOC_KINDS: readonly DocKind[] = [
    'body',
    'meta',
    'comments',
];

/** Base64 state vectors per doc; null = doc not synced. */
export type StateVectors = Record<DocKind, string | null>;

export interface CloudAccount {
    accountId: string,
    email: string,
    /** The post-sign-in check ran for this account on this device. */
    checked: boolean,
}

export interface SyncedScriptState {
    scriptId: string,
    accountId: string,
    stateVectors: StateVectors,
    syncedAt: number,
}

export interface LocalScriptInfo {
    scriptId: string,
    title: string,
    /** Local clock, ms. */
    updatedAt: number,
}

export interface LocalTombstoneRecord {
    scriptId: string,
    accountId: string,
    deletedAt: number,
}

/** Device-local sync bookkeeping (PGlite tables `sync_*`). */
export interface CloudSyncStore {
    getAccount(): Promise<CloudAccount | null>,
    setAccount(account: CloudAccount): Promise<void>,
    clearAccount(): Promise<void>,
    listLocalScripts(): Promise<LocalScriptInfo[]>,
    listSyncStates(): Promise<SyncedScriptState[]>,
    setSyncState(state: SyncedScriptState): Promise<void>,
    clearSyncState(scriptId: string): Promise<void>,
    listTombstones(): Promise<LocalTombstoneRecord[]>,
    addTombstone(scriptId: string, accountId: string): Promise<void>,
    removeTombstone(scriptId: string): Promise<void>,
    /** Empty local script row for a script coming from the cloud. */
    createScriptShell(scriptId: string, title: string): Promise<void>,
    /** Copy with fresh ids (rules of `duplicate.ts`), from the current projection. */
    duplicateScript(sourceScriptId: string, targetScriptId: string, title: string): Promise<void>,
    /** Removes the script's projection rows (its Y state is cleared by the engine). */
    deleteScript(scriptId: string): Promise<void>,
    /** Attachments of the script whose blob is not in the cloud yet. */
    listPendingUploads(scriptId: string): Promise<PendingAttachment[]>,
    markAttachmentUploaded(attachmentId: string, scriptId: string): Promise<void>,
    findAttachment(storageKey: string): Promise<{
        attachmentId: string,
        scriptId: string,
        sha256: string | null,
    } | null>,
}

export interface PendingAttachment {
    attachmentId: string,
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
}

/** Local blob storage (the app's `FileStorage`). */
export interface AttachmentFiles {
    get(storageKey: string): Promise<Blob | null>,
    put(storageKey: string, blob: Blob): Promise<void>,
}

/** Script as listed by `GET /scripts` of the collab service. */
export interface CloudScript {
    id: string,
    title: string,
    role: 'owner' | 'editor' | 'commenter' | 'viewer',
    createdAt: string,
    updatedAt: string,
    deletedAt: string | null,
    stateVectors: Partial<Record<DocKind, string>>,
}

export type CloudStatusState = 'signed-out' | 'needs-check' | 'checking' | 'syncing' | 'synced' | 'offline' | 'error';

export interface CloudStatus {
    state: CloudStatusState,
    email: string | null,
    /** Scripts with local changes not yet confirmed by the server. */
    pending: number,
    lastSyncedAt: number | null,
    error: string | null,
}

export const SIGNED_OUT_STATUS: CloudStatus = {
    state: 'signed-out',
    email: null,
    pending: 0,
    lastSyncedAt: null,
    error: null,
};

export interface CloudConflict {
    scriptId: string,
    title: string,
    differingScenes: number,
    localUpdatedAt: number,
    cloudUpdatedAt: number,
    newer: 'local' | 'cloud',
}

/** What the post-sign-in check found; only conflicts need a user choice. */
export interface CloudCheckReport {
    email: string,
    upload: number,
    download: number,
    delete: number,
    restore: number,
    conflicts: CloudConflict[],
}

export type ConflictResolution = 'keep-both' | 'use-newer';

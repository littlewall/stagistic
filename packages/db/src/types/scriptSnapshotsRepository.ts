import type {ScriptSummaryMetadata} from '@stagistic/script';

import type {ScriptSnapshot, ScriptSnapshotKind} from './';

export interface CreateScriptSnapshotInput {
    id: string,
    kind: ScriptSnapshotKind,
    /** Required for a version; ignored for a draft. */
    name?: string | null,
    /** Draft reason or version note. */
    note?: string | null,
    /** Serialized package snapshot; stored in FileStorage, not in the database. */
    payload: Blob,
    documentSchemaVersion: number,
    summaryMetadata: ScriptSummaryMetadata | null,
    /** Attachment blobs the payload references; protected from deletion while the snapshot exists. */
    attachmentStorageKeys: readonly string[],
    timestamp?: number,
}

export interface UpdateScriptSnapshotInput {
    name?: string | null,
    note?: string | null,
    /** Only draft → version is allowed. */
    kind?: 'version',
}

/** New serialized state of a snapshot whose settings were edited; content is unchanged. */
export interface ReplaceScriptSnapshotPayloadInput {
    payload: Blob,
    documentSchemaVersion: number,
    summaryMetadata: ScriptSummaryMetadata | null,
}

export interface ScriptSnapshotsRepository {
    list(scriptId: string): Promise<ScriptSnapshot[]>,
    get(scriptId: string, snapshotId: string): Promise<ScriptSnapshot | null>,
    create(scriptId: string, input: CreateScriptSnapshotInput): Promise<ScriptSnapshot | null>,
    update(scriptId: string, snapshotId: string, input: UpdateScriptSnapshotInput): Promise<ScriptSnapshot | null>,
    delete(scriptId: string, snapshotId: string): Promise<void>,
    replacePayload(scriptId: string, snapshotId: string, input: ReplaceScriptSnapshotPayloadInput): Promise<ScriptSnapshot | null>,
    loadPayload(scriptId: string, snapshotId: string): Promise<Blob | null>,
}

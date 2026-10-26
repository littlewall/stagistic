import type {
    ScriptRepository,
    ScriptSnapshot,
    ScriptSnapshotKind,
} from '@stagistic/db';
import {buildScriptSummaryMetadata, SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {
    decodeStepkgSnapshotPayload,
    encodeStepkgSnapshotPayload,
    remapStepkgBlockIds,
    remapStepkgIds,
    type StepkgImportIssue,
    type StepkgSnapshot,
} from '@stagistic/stepkg';

import {mapScriptPackageSourceToStepkg} from '../stepkg/mapScriptPackageSource';
import {mapStepkgSnapshotToPackageWrite} from '../stepkg/mapStepkgSnapshotToPackageWrite';
import {buildSnapshotRestoreWrite} from './buildSnapshotRestoreWrite';
import {getScriptSnapshotLabel} from './scriptSnapshotLabel';

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

const readCurrentSnapshot = async (repository: ScriptRepository, scriptId: string) => {
    const source = await repository.getScriptPackageSource(scriptId);

    if (!source) {
        throw new Error(`Script ${scriptId} does not exist.`);
    }

    return source;
};

/** Serialized state of a script, with the metadata a snapshot row keeps beside it. */
const encodeSnapshotState = async (repository: ScriptRepository, scriptId: string) => {
    const source = await readCurrentSnapshot(repository, scriptId);
    const payload = encodeStepkgSnapshotPayload(mapScriptPackageSourceToStepkg(source));

    return {
        source,
        payload: new Blob([toArrayBuffer(payload)], {type: 'application/octet-stream'}),
        documentSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        summaryMetadata: source.script.summaryMetadata ?? buildScriptSummaryMetadata(source.document),
    };
};

export interface CreateScriptSnapshotArgs {
    repository: ScriptRepository,
    scriptId: string,
    kind: ScriptSnapshotKind,
    name?: string | null,
    note?: string | null,
    /** Persist pending editor changes first, so the snapshot matches what the writer sees. */
    flush?: () => Promise<void>,
}

export const createScriptSnapshotFromCurrent = async ({
    repository,
    scriptId,
    kind,
    name,
    note,
    flush,
}: CreateScriptSnapshotArgs): Promise<ScriptSnapshot | null> => {
    await flush?.();

    const {
        source,
        payload,
        documentSchemaVersion,
        summaryMetadata,
    } = await encodeSnapshotState(repository, scriptId);

    return repository.createScriptSnapshot(scriptId, {
        id: repository.allocateScriptSnapshotId(),
        kind,
        name,
        note,
        payload,
        documentSchemaVersion,
        summaryMetadata,
        attachmentStorageKeys: source.attachments.map(attachment => attachment.storageKey),
    });
};

/**
 * Save the settings edited in a snapshot view back into the snapshot. The view
 * holds the only copy of the edit, so the whole state is re-serialized; the
 * content inside it cannot have changed.
 */
export const saveScriptSnapshotFromView = async ({
    viewRepository,
    liveRepository,
    scriptId,
    snapshotId,
}: {
    viewRepository: ScriptRepository,
    liveRepository: ScriptRepository,
    scriptId: string,
    snapshotId: string,
}): Promise<ScriptSnapshot | null> => {
    const {
        payload,
        documentSchemaVersion,
        summaryMetadata,
    } = await encodeSnapshotState(viewRepository, scriptId);

    return liveRepository.replaceScriptSnapshotPayload(scriptId, snapshotId, {
        payload,
        documentSchemaVersion,
        summaryMetadata,
    });
};

export type LoadScriptSnapshotResult = {ok: true, snapshot: StepkgSnapshot} | {ok: false, issues: StepkgImportIssue[]};

export const loadScriptSnapshot = async ({
    repository,
    scriptId,
    snapshotId,
}: {
    repository: ScriptRepository,
    scriptId: string,
    snapshotId: string,
}): Promise<LoadScriptSnapshotResult> => {
    const payload = await repository.loadScriptSnapshotPayload(scriptId, snapshotId);

    if (!payload) {
        return {ok: false, issues: [{code: 'file_missing', stage: 'read'}]};
    }

    const decoded = decodeStepkgSnapshotPayload(new Uint8Array(await payload.arrayBuffer()));

    return decoded.ok ? {ok: true, snapshot: decoded.snapshot} : decoded;
};

export type RestoreScriptSnapshotResult = {ok: true, backup: ScriptSnapshot | null} | {ok: false, issues: StepkgImportIssue[]};

/**
 * Restore a stored snapshot into its own script. The current state is saved
 * first as a draft noted “Before restoring <label>”, so nothing is lost.
 */
export const restoreScriptSnapshot = async ({
    repository,
    scriptId,
    snapshot,
    flush,
}: {
    repository: ScriptRepository,
    scriptId: string,
    snapshot: ScriptSnapshot,
    flush?: () => Promise<void>,
}): Promise<RestoreScriptSnapshotResult> => {
    await flush?.();

    const loaded = await loadScriptSnapshot({
        repository,
        scriptId,
        snapshotId: snapshot.id,
    });

    if (!loaded.ok) {
        return loaded;
    }

    const backup = await createScriptSnapshotFromCurrent({
        repository,
        scriptId,
        kind: 'draft',
        note: `Before restoring ${getScriptSnapshotLabel(snapshot)}`,
    });
    const current = mapScriptPackageSourceToStepkg(await readCurrentSnapshot(repository, scriptId));

    try {
        await repository.restoreScriptFromPackage(buildSnapshotRestoreWrite(loaded.snapshot, current, Date.now()));
    } catch {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {ok: true, backup};
};

export type RestoreScriptSnapshotAsNewResult = {
    ok: true,
    scriptId: string,
    title: string,
} | {ok: false, issues: StepkgImportIssue[]};

/**
 * Create an independent script from a stored snapshot. Attachment blobs are
 * shared with the snapshot rather than copied.
 */
export const restoreScriptSnapshotAsNew = async ({
    repository,
    scriptId,
    snapshotId,
    title,
}: {
    repository: ScriptRepository,
    scriptId: string,
    snapshotId: string,
    title: string,
}): Promise<RestoreScriptSnapshotAsNewResult> => {
    const loaded = await loadScriptSnapshot({
        repository,
        scriptId,
        snapshotId,
    });

    if (!loaded.ok) {
        return loaded;
    }

    const {snapshot} = remapStepkgIds(remapStepkgBlockIds(loaded.snapshot));
    const write = mapStepkgSnapshotToPackageWrite(snapshot, 'existing-storage-keys');
    const now = Date.now();

    write.script = {
        ...write.script,
        title: title.trim() || write.script.title,
        createdAt: now,
        updatedAt: now,
    };

    try {
        await repository.createScriptFromPackage(write);
    } catch {
        return {ok: false, issues: [{code: 'write_failed', stage: 'write'}]};
    }

    return {
        ok: true,
        scriptId: write.script.id,
        title: write.script.title,
    };
};

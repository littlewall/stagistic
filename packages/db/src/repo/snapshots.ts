import * as dbQueries from '../queries';
import type {FileStorage} from '../storage/fileStorage';
import {LOCAL_COMMENT_AUTHOR_ID, type ScriptSnapshot} from '../types';
import type {ScriptSnapshotsRepository} from '../types/scriptRepository';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

interface CreateSnapshotHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
    fileStorage: FileStorage,
}

export class InvalidScriptSnapshotError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidScriptSnapshotError';
    }
}

const normalizeText = (value: string | null | undefined): string | null => {
    const trimmed = value?.replace(/\s+/gu, ' ').trim() ?? '';

    return trimmed || null;
};

const toSnapshot = (row: Awaited<ReturnType<typeof dbQueries.getScriptSnapshotById>>): ScriptSnapshot | null => {
    if (!row) {
        return null;
    }

    return {...row, kind: row.kind === 'version' ? 'version' : 'draft'};
};

export const createSnapshotHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
    fileStorage,
}: CreateSnapshotHandlersArgs): ScriptSnapshotsRepository => {
    const deleteBlobsBestEffort = async (storageKeys: readonly string[], context: string) => {
        await Promise.all(storageKeys.map(storageKey => fileStorage.delete(storageKey).catch(() => {
            console.error(`[snapshots] Failed to clean up ${context}.`);
        })));
    };

    const list: ScriptSnapshotsRepository['list'] = async scriptId => {
        const rows = await dbQueries.listScriptSnapshots(await getDb(), scriptId);

        return rows.flatMap(row => toSnapshot(row) ?? []);
    };

    const get: ScriptSnapshotsRepository['get'] = async (scriptId, snapshotId) => {
        return toSnapshot(await dbQueries.getScriptSnapshotById(await getDb(), {scriptId, snapshotId}));
    };

    const create: ScriptSnapshotsRepository['create'] = async (scriptId, input) => {
        const name = input.kind === 'version' ? normalizeText(input.name) : null;
        const note = normalizeText(input.note);

        if (input.kind === 'version' && !name) {
            throw new InvalidScriptSnapshotError('A version needs a name.');
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();
        const payloadStorageKey = await fileStorage.save(input.payload);

        try {
            await db.transaction(async tx => {
                const number = input.kind === 'draft'
                    ? await dbQueries.allocateScriptDraftNumber(tx, scriptId)
                    : null;

                if (input.kind === 'draft' && number === null) {
                    throw new InvalidScriptSnapshotError(`Script ${scriptId} does not exist.`);
                }

                await dbQueries.insertScriptSnapshot(tx, {
                    id: input.id,
                    scriptId,
                    kind: input.kind,
                    number,
                    name,
                    note,
                    payloadStorageKey,
                    payloadByteLength: input.payload.size,
                    documentSchemaVersion: input.documentSchemaVersion,
                    summaryMetadata: input.summaryMetadata,
                    createdBy: LOCAL_COMMENT_AUTHOR_ID,
                    createdAt: now,
                    updatedAt: now,
                });
                await dbQueries.insertScriptSnapshotAttachmentRefs(tx, {
                    snapshotId: input.id,
                    storageKeys: input.attachmentStorageKeys,
                });
                await recordOutbox({
                    scriptId,
                    entityKey: `snapshot:${input.id}`,
                    opType: 'snapshot.create',
                    occurredAt: now,
                    payloadJson: JSON.stringify({
                        scriptId,
                        snapshotId: input.id,
                        kind: input.kind,
                        number,
                        name,
                        note,
                        createdAt: now,
                    }),
                }, tx);
            });
        } catch (error) {
            await deleteBlobsBestEffort([payloadStorageKey], 'an uncommitted snapshot payload');
            throw error;
        }

        await syncDb();

        return get(scriptId, input.id);
    };

    const update: ScriptSnapshotsRepository['update'] = async (scriptId, snapshotId, input) => {
        const db = await getDb();
        const current = await get(scriptId, snapshotId);

        if (!current) {
            return null;
        }

        const kind = input.kind ?? current.kind;
        const name = kind === 'version'
            ? normalizeText(input.name === undefined ? current.name : input.name)
            : null;
        const note = input.note === undefined ? current.note : normalizeText(input.note);

        if (kind === 'version' && !name) {
            throw new InvalidScriptSnapshotError('A version needs a name.');
        }

        if (kind === current.kind && name === current.name && note === current.note) {
            return current;
        }

        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.updateScriptSnapshot(tx, {
                scriptId,
                snapshotId,
                kind,
                name,
                note,
                updatedAt: now,
            });
            await recordOutbox({
                scriptId,
                entityKey: `snapshot:${snapshotId}`,
                opType: 'snapshot.update',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    snapshotId,
                    kind,
                    name,
                    note,
                    updatedAt: now,
                }),
            }, tx);
        });
        await syncDb();

        return get(scriptId, snapshotId);
    };

    const remove: ScriptSnapshotsRepository['delete'] = async (scriptId, snapshotId) => {
        const db = await getDb();
        const now = Date.now();
        // The payload and attachment blobs are released by `collectUnreferencedFiles` at the next startup.
        const isDeleted = await db.transaction(async tx => {
            const row = await dbQueries.getScriptSnapshotById(tx, {scriptId, snapshotId});

            if (!row) {
                return false;
            }

            await dbQueries.deleteScriptSnapshot(tx, {scriptId, snapshotId});
            await recordOutbox({
                scriptId,
                entityKey: `snapshot:${snapshotId}`,
                opType: 'snapshot.delete',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    snapshotId,
                    deletedAt: now,
                }),
            }, tx);

            return true;
        });

        if (isDeleted) {
            await syncDb();
        }
    };

    /*
     * The previous payload blob is left for `collectUnreferencedFiles`: deleting
     * it here would lose the snapshot if the row update did not reach disk.
     */
    const replacePayload: ScriptSnapshotsRepository['replacePayload'] = async (scriptId, snapshotId, input) => {
        const db = await getDb();
        const now = Date.now();
        const payloadStorageKey = await fileStorage.save(input.payload);
        let isReplaced: boolean;

        try {
            isReplaced = await db.transaction(async tx => {
                const replaced = await dbQueries.replaceScriptSnapshotPayload(tx, {
                    scriptId,
                    snapshotId,
                    payloadStorageKey,
                    payloadByteLength: input.payload.size,
                    documentSchemaVersion: input.documentSchemaVersion,
                    summaryMetadata: input.summaryMetadata,
                    updatedAt: now,
                });

                if (replaced) {
                    await recordOutbox({
                        scriptId,
                        entityKey: `snapshot:${snapshotId}`,
                        opType: 'snapshot.replacePayload',
                        occurredAt: now,
                        payloadJson: JSON.stringify({
                            scriptId,
                            snapshotId,
                            updatedAt: now,
                        }),
                    }, tx);
                }

                return replaced;
            });
        } catch (error) {
            await deleteBlobsBestEffort([payloadStorageKey], 'an uncommitted snapshot payload');
            throw error;
        }

        if (!isReplaced) {
            await deleteBlobsBestEffort([payloadStorageKey], 'a payload for a missing snapshot');

            return null;
        }

        await syncDb();

        return get(scriptId, snapshotId);
    };

    const loadPayload: ScriptSnapshotsRepository['loadPayload'] = async (scriptId, snapshotId) => {
        const row = await dbQueries.getScriptSnapshotById(await getDb(), {scriptId, snapshotId});

        return row ? fileStorage.get(row.payloadStorageKey) : null;
    };

    return {
        list,
        get,
        create,
        update,
        delete: remove,
        replacePayload,
        loadPayload,
    };
};

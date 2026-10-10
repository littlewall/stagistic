import {
    and,
    desc,
    eq,
    inArray,
    type InferInsertModel,
    sql,
} from 'drizzle-orm';

import {
    scriptAttachments,
    scripts,
    scriptSnapshotAttachmentRefs,
    scriptSnapshots,
} from '../../schema';
import type {DbClient} from '../types';

export type InsertScriptSnapshotRow = InferInsertModel<typeof scriptSnapshots>;

export const listScriptSnapshots = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptSnapshots)
        .where(eq(scriptSnapshots.scriptId, scriptId))
        .orderBy(desc(scriptSnapshots.createdAt), desc(scriptSnapshots.id));
};

export const getScriptSnapshotById = async (db: DbClient, payload: {scriptId: string, snapshotId: string}) => {
    const rows = await db
        .select()
        .from(scriptSnapshots)
        .where(and(eq(scriptSnapshots.scriptId, payload.scriptId), eq(scriptSnapshots.id, payload.snapshotId)))
        .limit(1);

    return rows[0] ?? null;
};

/**
 * Atomically bump and return the script's draft counter. Returns null when the
 * script does not exist.
 */
export const allocateScriptDraftNumber = async (db: DbClient, scriptId: string): Promise<number | null> => {
    const rows = await db
        .update(scripts)
        .set({lastDraftNumber: sql`${scripts.lastDraftNumber} + 1`})
        .where(eq(scripts.id, scriptId))
        .returning({lastDraftNumber: scripts.lastDraftNumber});

    return rows[0]?.lastDraftNumber ?? null;
};

export const insertScriptSnapshot = async (db: DbClient, row: InsertScriptSnapshotRow) => {
    await db.insert(scriptSnapshots).values(row);
};

export const insertScriptSnapshotAttachmentRefs = async (
    db: DbClient,
    payload: {snapshotId: string, storageKeys: readonly string[]},
) => {
    const storageKeys = [...new Set(payload.storageKeys)];

    if (storageKeys.length > 0) {
        await db
            .insert(scriptSnapshotAttachmentRefs)
            .values(storageKeys.map(storageKey => ({snapshotId: payload.snapshotId, storageKey})));
    }
};

export const listScriptSnapshotAttachmentRefs = async (db: DbClient, snapshotId: string): Promise<string[]> => {
    const rows = await db
        .select({storageKey: scriptSnapshotAttachmentRefs.storageKey})
        .from(scriptSnapshotAttachmentRefs)
        .where(eq(scriptSnapshotAttachmentRefs.snapshotId, snapshotId));

    return rows.map(row => row.storageKey);
};

export const updateScriptSnapshot = async (
    db: DbClient,
    payload: {
        scriptId: string,
        snapshotId: string,
        kind: string,
        name: string | null,
        note: string | null,
        updatedAt: number,
    },
) => {
    await db
        .update(scriptSnapshots)
        .set({
            kind: payload.kind,
            name: payload.name,
            note: payload.note,
            updatedAt: payload.updatedAt,
        })
        .where(and(eq(scriptSnapshots.scriptId, payload.scriptId), eq(scriptSnapshots.id, payload.snapshotId)));
};

export const deleteScriptSnapshot = async (db: DbClient, payload: {scriptId: string, snapshotId: string}) => {
    await db
        .delete(scriptSnapshots)
        .where(and(eq(scriptSnapshots.scriptId, payload.scriptId), eq(scriptSnapshots.id, payload.snapshotId)));
};

/**
 * Snapshot payloads of a script, read before a script delete cascades the rows
 * away, so their blobs can be released afterwards.
 */
export const listScriptSnapshotStorageKeys = async (db: DbClient, scriptId: string) => {
    const snapshotRows = await db
        .select({id: scriptSnapshots.id, payloadStorageKey: scriptSnapshots.payloadStorageKey})
        .from(scriptSnapshots)
        .where(eq(scriptSnapshots.scriptId, scriptId));
    const snapshotIds = snapshotRows.map(row => row.id);
    const refRows = snapshotIds.length > 0
        ? await db
            .select({storageKey: scriptSnapshotAttachmentRefs.storageKey})
            .from(scriptSnapshotAttachmentRefs)
            .where(inArray(scriptSnapshotAttachmentRefs.snapshotId, snapshotIds))
        : [];

    return {
        payloadStorageKeys: snapshotRows.map(row => row.payloadStorageKey),
        attachmentStorageKeys: [...new Set(refRows.map(row => row.storageKey))],
    };
};

/**
 * Keep only storage keys no attachment row or snapshot still references. Every
 * attachment blob deletion goes through this, because snapshots and scripts
 * restored from them share blobs instead of copying them.
 */
export const filterUnreferencedStorageKeys = async (db: DbClient, storageKeys: readonly string[]): Promise<string[]> => {
    const candidates = [...new Set(storageKeys)];

    if (candidates.length === 0) {
        return [];
    }

    const [attachmentRows, refRows] = await Promise.all([
        db
            .select({storageKey: scriptAttachments.storageKey})
            .from(scriptAttachments)
            .where(inArray(scriptAttachments.storageKey, candidates)),
        db
            .select({storageKey: scriptSnapshotAttachmentRefs.storageKey})
            .from(scriptSnapshotAttachmentRefs)
            .where(inArray(scriptSnapshotAttachmentRefs.storageKey, candidates)),
    ]);
    const referenced = new Set([...attachmentRows, ...refRows].map(row => row.storageKey));

    return candidates.filter(storageKey => !referenced.has(storageKey));
};

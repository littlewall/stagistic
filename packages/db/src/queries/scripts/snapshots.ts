import {
    and,
    desc,
    eq,
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

/** Every storage key a row still points at: attachments, snapshot payloads and snapshot attachment refs. */
export const listReferencedStorageKeys = async (db: DbClient): Promise<Set<string>> => {
    const [
        attachmentRows,
        payloadRows,
        refRows,
    ] = await Promise.all([
        db.select({storageKey: scriptAttachments.storageKey}).from(scriptAttachments),
        db.select({storageKey: scriptSnapshots.payloadStorageKey}).from(scriptSnapshots),
        db.select({storageKey: scriptSnapshotAttachmentRefs.storageKey}).from(scriptSnapshotAttachmentRefs),
    ]);

    return new Set([
        ...attachmentRows,
        ...payloadRows,
        ...refRows,
    ].map(row => row.storageKey));
};

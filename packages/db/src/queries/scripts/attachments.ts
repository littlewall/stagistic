import {
    and, eq, sql,
} from 'drizzle-orm';

import {scriptAttachments, scriptCueAttachments} from '../../schema';
import type {CueAttachmentRole} from '../../types';
import type {DbClient} from '../types';

export interface InsertAttachmentRow {
    id: string,
    scriptId: string,
    filename: string,
    mimeType: string,
    sizeBytes: number,
    storageKey: string,
    createdAt: number,
    updatedAt: number,
}

export type AttachmentRow = InsertAttachmentRow;

export const insertAttachment = async (db: DbClient, row: InsertAttachmentRow) => {
    await db.insert(scriptAttachments).values(row);
};

export const insertCueAttachmentLink = async (
    db: DbClient,
    row: {
        cueId: string,
        attachmentId: string,
        role: CueAttachmentRole,
        sortOrder: number,
        createdAt: number,
    },
) => {
    await db.insert(scriptCueAttachments).values(row);
};

export const getAttachmentByCueRole = async (
    db: DbClient,
    cueId: string,
    role: CueAttachmentRole,
): Promise<AttachmentRow | null> => {
    const rows = await db
        .select({
            id: scriptAttachments.id,
            scriptId: scriptAttachments.scriptId,
            filename: scriptAttachments.filename,
            mimeType: scriptAttachments.mimeType,
            sizeBytes: scriptAttachments.sizeBytes,
            storageKey: scriptAttachments.storageKey,
            createdAt: scriptAttachments.createdAt,
            updatedAt: scriptAttachments.updatedAt,
        })
        .from(scriptCueAttachments)
        .innerJoin(scriptAttachments, eq(scriptCueAttachments.attachmentId, scriptAttachments.id))
        .where(and(
            eq(scriptCueAttachments.cueId, cueId),
            eq(scriptCueAttachments.role, role),
        ))
        .limit(1);

    return rows[0] ?? null;
};

export const getAttachmentById = async (db: DbClient, attachmentId: string): Promise<AttachmentRow | null> => {
    const rows = await db
        .select()
        .from(scriptAttachments)
        .where(eq(scriptAttachments.id, attachmentId))
        .limit(1);

    return rows[0] ?? null;
};

export const deleteCueAttachmentLinkByRole = async (
    db: DbClient,
    payload: {cueId: string, role: CueAttachmentRole},
) => {
    await db
        .delete(scriptCueAttachments)
        .where(and(
            eq(scriptCueAttachments.cueId, payload.cueId),
            eq(scriptCueAttachments.role, payload.role),
        ));
};

export const deleteAttachment = async (db: DbClient, attachmentId: string) => {
    await db.delete(scriptAttachments).where(eq(scriptAttachments.id, attachmentId));
};

export const countAttachmentLinks = async (db: DbClient, attachmentId: string): Promise<number> => {
    const rows = await db
        .select({count: sql<number>`count(*)::int`})
        .from(scriptCueAttachments)
        .where(eq(scriptCueAttachments.attachmentId, attachmentId));

    return rows[0]?.count ?? 0;
};

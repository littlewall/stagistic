import {
    and, eq, sql,
} from 'drizzle-orm';

import {
    scriptAttachments,
    scriptMusic,
    scriptMusicAttachments,
} from '../../schema';
import type {
    MusicAttachmentRole,
    ScriptMusicAttachmentBinding,
} from '../../types';
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

export const listScriptAttachments = async (
    db: DbClient,
    scriptId: string,
) => db
    .select()
    .from(scriptAttachments)
    .where(eq(scriptAttachments.scriptId, scriptId));

export const listScriptMusicAttachmentBindings = async (
    db: DbClient,
    scriptId: string,
) => {
    const rows = await db.select({
        musicId: scriptMusicAttachments.musicId,
        attachmentId: scriptMusicAttachments.attachmentId,
        role: scriptMusicAttachments.role,
        sortOrder: scriptMusicAttachments.sortOrder,
        createdAt: scriptMusicAttachments.createdAt,
    })
        .from(scriptMusicAttachments)
        .innerJoin(scriptMusic, eq(scriptMusicAttachments.musicId, scriptMusic.id))
        .where(eq(scriptMusic.scriptId, scriptId));

    return rows.flatMap<ScriptMusicAttachmentBinding>(row => {
        return row.role === 'integrated_score'
            ? [{...row, role: 'integrated_score'}]
            : [];
    });
};

export const insertAttachment = async (db: DbClient, row: InsertAttachmentRow) => {
    await db.insert(scriptAttachments).values(row);
};

export const insertMusicAttachmentLink = async (
    db: DbClient,
    row: {
        musicId: string,
        attachmentId: string,
        role: MusicAttachmentRole,
        sortOrder: number,
        createdAt: number,
    },
) => {
    await db.insert(scriptMusicAttachments).values(row);
};

export const getAttachmentByMusicRole = async (
    db: DbClient,
    musicId: string,
    role: MusicAttachmentRole,
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
        .from(scriptMusicAttachments)
        .innerJoin(scriptAttachments, eq(scriptMusicAttachments.attachmentId, scriptAttachments.id))
        .where(and(
            eq(scriptMusicAttachments.musicId, musicId),
            eq(scriptMusicAttachments.role, role),
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

export const deleteMusicAttachmentLinkByRole = async (
    db: DbClient,
    payload: {musicId: string, role: MusicAttachmentRole},
) => {
    await db
        .delete(scriptMusicAttachments)
        .where(and(
            eq(scriptMusicAttachments.musicId, payload.musicId),
            eq(scriptMusicAttachments.role, payload.role),
        ));
};

export const deleteAttachment = async (db: DbClient, attachmentId: string) => {
    await db.delete(scriptAttachments).where(eq(scriptAttachments.id, attachmentId));
};

export const countAttachmentLinks = async (db: DbClient, attachmentId: string): Promise<number> => {
    const rows = await db
        .select({count: sql<number>`count(*)::int`})
        .from(scriptMusicAttachments)
        .where(eq(scriptMusicAttachments.attachmentId, attachmentId));

    return rows[0]?.count ?? 0;
};

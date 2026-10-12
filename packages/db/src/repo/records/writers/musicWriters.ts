import {and, eq} from 'drizzle-orm';

import {
    scriptAttachments,
    scriptMusic,
    scriptMusicAttachments,
} from '../../../schema';
import {
    existingIds,
    num,
    str,
    type Upserts,
    type WriteContext,
} from './shared';

export const writeMusic = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptMusic).where(and(eq(scriptMusic.scriptId, scriptId), eq(scriptMusic.id, id)));
            continue;
        }

        // Placement (scene, blocks) is body-derived and left to the body projection.
        const fields = {
            title: str(record.title) ?? '',
            kind: str(record.kind),
            updatedAt: now,
        };

        await tx
            .insert(scriptMusic)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({target: scriptMusic.id, set: fields});
    }
};

export const writeAttachments = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptAttachments).where(and(eq(scriptAttachments.scriptId, scriptId), eq(scriptAttachments.id, id)));
            continue;
        }

        const fields = {
            filename: str(record.filename) ?? '',
            mimeType: str(record.mimeType) ?? 'application/octet-stream',
            sizeBytes: num(record.sizeBytes, 0),
            storageKey: str(record.storageKey) ?? '',
            updatedAt: now,
        };

        await tx
            .insert(scriptAttachments)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({target: scriptAttachments.id, set: fields});
    }
};

export const writeMusicAttachments = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    const music = await existingIds(tx, scriptMusic, scriptId);
    const attachments = await existingIds(tx, scriptAttachments, scriptId);

    for (const [id, record] of Object.entries(upserts)) {
        const separator = id.lastIndexOf(':');
        const musicId = id.slice(0, separator);
        const role = id.slice(separator + 1);

        await tx.delete(scriptMusicAttachments).where(and(eq(scriptMusicAttachments.musicId, musicId), eq(scriptMusicAttachments.role, role)));

        const attachmentId = str(record?.attachmentId);

        if (record && attachmentId !== null && music.has(musicId) && attachments.has(attachmentId)) {
            await tx
                .delete(scriptMusicAttachments)
                .where(and(eq(scriptMusicAttachments.musicId, musicId), eq(scriptMusicAttachments.attachmentId, attachmentId)));
            await tx.insert(scriptMusicAttachments).values({
                musicId,
                attachmentId,
                role,
                sortOrder: num(record.sortOrder, 0),
                createdAt: num(record.createdAt, now),
            });
        }
    }
};

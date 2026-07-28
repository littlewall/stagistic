import {uuidv7} from '@stagistic/shared';

import type {FileStorage} from '../fileStorage';
import * as dbQueries from '../queries';
import type {ScriptAttachmentsRepository} from '../scriptRepository';
import type {
    GetDb, RecordOutbox, SyncDb,
} from './types';

interface CreateAttachmentHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
    fileStorage: FileStorage,
}

export const createAttachmentHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
    fileStorage,
}: CreateAttachmentHandlersArgs): ScriptAttachmentsRepository => {
    const getByMusicRole: ScriptAttachmentsRepository['getByMusicRole'] = async (musicId, role) => {
        const db = await getDb();
        const attachment = await dbQueries.getAttachmentByMusicRole(db, musicId, role);

        return attachment ? {...attachment, role} : null;
    };

    const setForMusic: ScriptAttachmentsRepository['setForMusic'] = async (scriptId, musicId, role, file) => {
        if (!musicId) {
            return null;
        }

        const storageKey = await fileStorage.save(file.blob);
        const db = await getDb();
        const now = Date.now();
        const attachmentId = uuidv7();
        const filename = file.name.trim() || 'attachment.pdf';

        let previousStorageKey: string | null = null;

        try {
            previousStorageKey = await db.transaction(async tx => {
                const previous = await dbQueries.getAttachmentByMusicRole(tx, musicId, role);

                await dbQueries.insertAttachment(tx, {
                    id: attachmentId,
                    scriptId,
                    filename,
                    mimeType: file.type || 'application/pdf',
                    sizeBytes: file.size,
                    storageKey,
                    createdAt: now,
                    updatedAt: now,
                });
                await dbQueries.deleteMusicAttachmentLinkByRole(tx, {musicId, role});
                await dbQueries.insertMusicAttachmentLink(tx, {
                    musicId,
                    attachmentId,
                    role,
                    sortOrder: now,
                    createdAt: now,
                });

                let orphanedStorageKey: string | null = null;

                if (previous) {
                    const remaining = await dbQueries.countAttachmentLinks(tx, previous.id);

                    if (remaining === 0) {
                        await dbQueries.deleteAttachment(tx, previous.id);
                        orphanedStorageKey = previous.storageKey;
                    }
                }

                await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
                await recordOutbox({
                    scriptId,
                    entityKey: `music:${musicId}:attachment:${role}`,
                    opType: 'musicAttachment.set',
                    occurredAt: now,
                    payloadJson: JSON.stringify({
                        scriptId,
                        musicId,
                        role,
                        attachmentId,
                        replacedAttachmentId: previous?.id ?? null,
                        filename,
                        updatedAt: now,
                    }),
                }, tx);

                return orphanedStorageKey;
            });
        } catch (error) {
            await fileStorage.delete(storageKey).catch(() => {
                console.error('[attachments] Failed to clean up an uncommitted blob.');
            });

            throw error;
        }

        await syncDb();

        if (previousStorageKey) {
            await fileStorage.delete(previousStorageKey).catch(() => {
                console.error('[attachments] Failed to clean up a replaced blob.');
            });
        }

        const attachment = await dbQueries.getAttachmentById(db, attachmentId);

        return attachment ? {...attachment, role} : null;
    };

    const removeFromMusic: ScriptAttachmentsRepository['removeFromMusic'] = async (scriptId, musicId, role) => {
        if (!musicId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();
        const removal = await db.transaction(async tx => {
            const attachment = await dbQueries.getAttachmentByMusicRole(tx, musicId, role);

            if (!attachment) {
                return null;
            }

            await dbQueries.deleteMusicAttachmentLinkByRole(tx, {musicId, role});

            const remaining = await dbQueries.countAttachmentLinks(tx, attachment.id);

            if (remaining === 0) {
                await dbQueries.deleteAttachment(tx, attachment.id);
            }

            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `music:${musicId}:attachment:${role}`,
                opType: 'musicAttachment.remove',
                occurredAt: now,
                payloadJson: JSON.stringify({
                    scriptId,
                    musicId,
                    role,
                    attachmentId: attachment.id,
                    updatedAt: now,
                }),
            }, tx);

            return {
                storageKey: remaining === 0 ? attachment.storageKey : null,
            };
        });

        if (!removal) {
            return;
        }

        await syncDb();

        if (removal.storageKey) {
            await fileStorage.delete(removal.storageKey).catch(() => {
                console.error('[attachments] Failed to clean up a removed blob.');
            });
        }
    };

    const getBlob: ScriptAttachmentsRepository['getBlob'] = async storageKey => {
        return fileStorage.get(storageKey);
    };

    return {
        getByMusicRole, setForMusic, removeFromMusic, getBlob,
    };
};

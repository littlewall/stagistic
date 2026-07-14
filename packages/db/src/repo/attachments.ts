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
    const getByCueRole: ScriptAttachmentsRepository['getByCueRole'] = async (cueId, role) => {
        const db = await getDb();
        const attachment = await dbQueries.getAttachmentByCueRole(db, cueId, role);

        return attachment ? {...attachment, role} : null;
    };

    const setForCue: ScriptAttachmentsRepository['setForCue'] = async (scriptId, cueId, role, file) => {
        if (!cueId) {
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
                const previous = await dbQueries.getAttachmentByCueRole(tx, cueId, role);

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
                await dbQueries.deleteCueAttachmentLinkByRole(tx, {cueId, role});
                await dbQueries.insertCueAttachmentLink(tx, {
                    cueId,
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
                    opType: 'cueAttachment.set',
                    payloadJson: JSON.stringify({
                        scriptId,
                        cueId,
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
            await fileStorage.delete(storageKey).catch(cleanupError => {
                console.error('[attachments] Failed to clean up an uncommitted blob.', cleanupError);
            });

            throw error;
        }

        await syncDb();

        if (previousStorageKey) {
            await fileStorage.delete(previousStorageKey).catch(error => {
                console.error('[attachments] Failed to clean up a replaced blob.', error);
            });
        }

        const attachment = await dbQueries.getAttachmentById(db, attachmentId);

        return attachment ? {...attachment, role} : null;
    };

    const removeFromCue: ScriptAttachmentsRepository['removeFromCue'] = async (scriptId, cueId, role) => {
        if (!cueId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();
        const removal = await db.transaction(async tx => {
            const attachment = await dbQueries.getAttachmentByCueRole(tx, cueId, role);

            if (!attachment) {
                return null;
            }

            await dbQueries.deleteCueAttachmentLinkByRole(tx, {cueId, role});

            const remaining = await dbQueries.countAttachmentLinks(tx, attachment.id);

            if (remaining === 0) {
                await dbQueries.deleteAttachment(tx, attachment.id);
            }

            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                opType: 'cueAttachment.remove',
                payloadJson: JSON.stringify({
                    scriptId,
                    cueId,
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
            await fileStorage.delete(removal.storageKey).catch(error => {
                console.error('[attachments] Failed to clean up a removed blob.', error);
            });
        }
    };

    const getBlob: ScriptAttachmentsRepository['getBlob'] = async storageKey => {
        return fileStorage.get(storageKey);
    };

    return {
        getByCueRole, setForCue, removeFromCue, getBlob,
    };
};

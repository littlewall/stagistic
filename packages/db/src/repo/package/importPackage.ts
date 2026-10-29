import {eq} from 'drizzle-orm';

import * as dbQueries from '../../queries';
import {
    scriptDetachedScenes,
    scriptSceneCharacters,
    scriptScenes,
} from '../../schema';
import type {FileStorage} from '../../storage/fileStorage';
import type {ScriptPackageWrite} from '../../types/scriptPackageWrite';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from '../types';
import {writePackageDomainRowsTx} from './writePackageDomainRows';

interface CreateImportPackageHandlerArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
    fileStorage: FileStorage,
}

const saveAttachmentBlobs = async (
    fileStorage: FileStorage,
    input: ScriptPackageWrite,
): Promise<{storageKeyByAttachment: Map<string, string>, savedKeys: string[]}> => {
    const storageKeyByAttachment = new Map<string, string>();
    const savedKeys: string[] = [];

    for (const attachment of input.attachments) {
        if (attachment.existingStorageKey !== undefined) {
            storageKeyByAttachment.set(attachment.id, attachment.existingStorageKey);
            continue;
        }

        const key = await fileStorage.save(attachment.blob);

        storageKeyByAttachment.set(attachment.id, key);
        savedKeys.push(key);
    }

    return {storageKeyByAttachment, savedKeys};
};

const deleteBlobsBestEffort = async (fileStorage: FileStorage, keys: string[], context: string): Promise<void> => {
    await Promise.all(
        keys.map(key => fileStorage.delete(key).catch(() => {
            console.error(`[import] Failed to clean up ${context}.`);
        })),
    );
};

export const createImportPackageHandler = ({
    getDb,
    recordOutbox,
    syncDb,
    fileStorage,
}: CreateImportPackageHandlerArgs) => {
    const createScriptFromPackage = async (input: ScriptPackageWrite): Promise<void> => {
        const db = await getDb();
        const scriptId = input.script.id;
        const now = input.script.updatedAt;
        const {storageKeyByAttachment, savedKeys} = await saveAttachmentBlobs(fileStorage, input);

        try {
            await db.transaction(async tx => {
                await dbQueries.insertScript(tx, {
                    id: scriptId,
                    title: input.script.title,
                    createdAt: input.script.createdAt,
                    updatedAt: input.script.updatedAt,
                });

                if (input.script.subtitle) {
                    await dbQueries.updateScriptSubtitle(tx, {
                        id: scriptId,
                        subtitle: input.script.subtitle,
                        updatedAt: now,
                    });
                }

                await writePackageDomainRowsTx(tx, scriptId, input, storageKeyByAttachment, now);

                await recordOutbox(
                    {
                        scriptId,
                        entityKey: `script:${scriptId}`,
                        opType: 'script.import',
                        occurredAt: now,
                        payloadJson: JSON.stringify({scriptId, createdAt: input.script.createdAt}),
                    },
                    tx,
                );
            });
        } catch (error) {
            await deleteBlobsBestEffort(fileStorage, savedKeys, 'an uncommitted blob');
            throw error;
        }

        await syncDb();
    };

    const restoreScriptFromPackage = async (input: ScriptPackageWrite): Promise<void> => {
        const db = await getDb();
        const scriptId = input.script.id;
        const now = input.script.updatedAt;
        const {storageKeyByAttachment, savedKeys} = await saveAttachmentBlobs(fileStorage, input);

        // Replaced attachment blobs are released by `collectUnreferencedFiles` at the next startup.
        try {
            await db.transaction(async tx => {
                await dbQueries.updateScript(tx, {
                    id: scriptId,
                    title: input.script.title,
                    subtitle: input.script.subtitle,
                    updatedAt: now,
                });

                await tx.delete(scriptDetachedScenes).where(eq(scriptDetachedScenes.scriptId, scriptId));
                await tx.delete(scriptSceneCharacters).where(eq(scriptSceneCharacters.scriptId, scriptId));
                await tx.update(scriptScenes).set({
                    synopsis: null,
                    colorHex: null,
                    locationId: null,
                }).where(eq(scriptScenes.scriptId, scriptId));
                await dbQueries.deleteScriptCharactersByScriptId(tx, scriptId);
                await dbQueries.deleteScriptCharacterGendersByScriptId(tx, scriptId);
                await dbQueries.deleteScriptLocationsByScriptId(tx, scriptId);
                await dbQueries.deleteScriptMusicByScriptId(tx, scriptId);
                await dbQueries.deleteScriptCommentThreadsByScriptId(tx, scriptId);
                await dbQueries.deleteScriptAttachmentsByScriptId(tx, scriptId);

                await writePackageDomainRowsTx(tx, scriptId, input, storageKeyByAttachment, now);

                await recordOutbox(
                    {
                        scriptId,
                        entityKey: `script:${scriptId}`,
                        opType: 'script.restore',
                        occurredAt: now,
                        payloadJson: JSON.stringify({scriptId, updatedAt: now}),
                    },
                    tx,
                );
            });
        } catch (error) {
            await deleteBlobsBestEffort(fileStorage, savedKeys, 'an uncommitted blob');
            throw error;
        }

        await syncDb();
    };

    return {createScriptFromPackage, restoreScriptFromPackage};
};

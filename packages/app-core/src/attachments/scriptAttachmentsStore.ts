import type {
    MusicAttachmentRole,
    MusicAttachmentUpload,
    ScriptAttachment,
    ScriptMusicAttachmentBinding,
    ScriptRepository,
} from '@stagistic/db';

import {
    createKeyedTaskQueue,
    createReactiveCollection,
    createRepositoryStoreRegistry,
} from '../collections';

const bindingKey = (binding: ScriptMusicAttachmentBinding) => `${binding.musicId}:${binding.role}`;

export const createScriptAttachmentsStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const attachmentsSource = repository.getScriptAttachmentsSource(scriptId);
    const bindingsSource = repository.getScriptMusicAttachmentBindingsSource(scriptId);
    const attachments = createReactiveCollection<ScriptAttachment, string>({
        id: `script-attachments:${scriptId}`,
        source: attachmentsSource,
        getKey: attachment => attachment.id,
    });
    const bindings = createReactiveCollection<ScriptMusicAttachmentBinding, string>({
        id: `script-music-attachments:${scriptId}`,
        source: bindingsSource,
        getKey: bindingKey,
    });
    const enqueueMusic = createKeyedTaskQueue<string>();

    const refresh = async () => {
        await Promise.all([attachmentsSource.refresh(), bindingsSource.refresh()]);
    };
    const upload = (
        musicId: string,
        role: MusicAttachmentRole,
        file: MusicAttachmentUpload,
    ) => enqueueMusic(musicId, async () => {
        await repository.setMusicAttachment(scriptId, musicId, role, file);
        await refresh();
    });
    const remove = (
        musicId: string,
        role: MusicAttachmentRole,
    ) => enqueueMusic(musicId, async () => {
        await repository.removeMusicAttachment(scriptId, musicId, role);
        await refresh();
    });

    return {
        attachmentsCollection: attachments.collection,
        attachmentsStatus: attachments.status,
        bindingsCollection: bindings.collection,
        bindingsStatus: bindings.status,
        upload,
        remove,
    };
};

export type ScriptAttachmentsStore = ReturnType<typeof createScriptAttachmentsStore>;

export const getScriptAttachmentsStore = createRepositoryStoreRegistry(
    createScriptAttachmentsStore,
);

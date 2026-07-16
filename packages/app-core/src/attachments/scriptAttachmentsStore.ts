import type {
    CueAttachmentRole,
    CueAttachmentUpload,
    ScriptAttachment,
    ScriptCueAttachmentBinding,
    ScriptRepository,
} from '@stagistic/db';

import {
    createKeyedTaskQueue,
    createReactiveCollection,
    createRepositoryStoreRegistry,
} from '../collections';

const bindingKey = (binding: ScriptCueAttachmentBinding) => `${binding.cueId}:${binding.role}`;

export const createScriptAttachmentsStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const attachmentsSource = repository.getScriptAttachmentsSource(scriptId);
    const bindingsSource = repository.getScriptCueAttachmentBindingsSource(scriptId);
    const attachments = createReactiveCollection<ScriptAttachment, string>({
        id: `script-attachments:${scriptId}`,
        source: attachmentsSource,
        getKey: attachment => attachment.id,
    });
    const bindings = createReactiveCollection<ScriptCueAttachmentBinding, string>({
        id: `script-cue-attachments:${scriptId}`,
        source: bindingsSource,
        getKey: bindingKey,
    });
    const enqueueCue = createKeyedTaskQueue<string>();

    const refresh = async () => {
        await Promise.all([attachmentsSource.refresh(), bindingsSource.refresh()]);
    };
    const upload = (
        cueId: string,
        role: CueAttachmentRole,
        file: CueAttachmentUpload,
    ) => enqueueCue(cueId, async () => {
        await repository.setCueAttachment(scriptId, cueId, role, file);
        await refresh();
    });
    const remove = (
        cueId: string,
        role: CueAttachmentRole,
    ) => enqueueCue(cueId, async () => {
        await repository.removeCueAttachment(scriptId, cueId, role);
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

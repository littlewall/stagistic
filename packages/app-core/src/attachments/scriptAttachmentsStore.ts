import type {
    CueAttachmentRole,
    CueAttachmentUpload,
    ScriptAttachment,
    ScriptCueAttachmentBinding,
    ScriptRepository,
} from '@stagistic/db';

import {createReactiveCollection} from '../collections';

const bindingKey = (binding: ScriptCueAttachmentBinding) => `${binding.cueId}:${binding.role}`;

const createCueQueue = () => {
    const queues = new Map<string, Promise<void>>();

    return (cueId: string, task: () => Promise<void>) => {
        const previous = queues.get(cueId) ?? Promise.resolve();
        const current = previous.catch(() => undefined).then(task);

        queues.set(cueId, current);
        void current.finally(() => {
            if (queues.get(cueId) === current) {
                queues.delete(cueId);
            }
        }).catch(() => undefined);

        return current;
    };
};

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
    const enqueueCue = createCueQueue();

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

const storesByRepository = new WeakMap<
    ScriptRepository,
    Map<string, ScriptAttachmentsStore>
>();

export const getScriptAttachmentsStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    let stores = storesByRepository.get(repository);

    if (!stores) {
        stores = new Map();
        storesByRepository.set(repository, stores);
    }

    const existing = stores.get(scriptId);

    if (existing) {
        return existing;
    }

    const store = createScriptAttachmentsStore(repository, scriptId);

    stores.set(scriptId, store);

    return store;
};

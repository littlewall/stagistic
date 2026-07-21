import {
    createInMemoryReactiveQuerySource,
    type ScriptAttachment,
    type ScriptMusicAttachmentBinding,
    type ScriptRepository,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptAttachmentsStore} from './scriptAttachmentsStore';

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(resolvePromise => {
        resolve = resolvePromise;
    });

    return {promise, resolve};
};

const attachment: ScriptAttachment = {
    id: 'attachment-1',
    scriptId: 'script-1',
    filename: 'score.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 3,
    storageKey: 'blob-1',
    createdAt: 1,
    updatedAt: 1,
};
const binding: ScriptMusicAttachmentBinding = {
    musicId: 'music-1',
    attachmentId: attachment.id,
    role: 'integrated_score',
    sortOrder: 1,
    createdAt: 1,
};

describe('script attachments store', () => {
    it('publishes metadata only after storage and SQL persistence succeed', async () => {
        const attachments = createInMemoryReactiveQuerySource<ScriptAttachment>([]);
        const bindings = createInMemoryReactiveQuerySource<ScriptMusicAttachmentBinding>([]);
        const gate = deferred();
        const repository = {
            getScriptAttachmentsSource: () => attachments,
            getScriptMusicAttachmentBindingsSource: () => bindings,
            setMusicAttachment: async () => {
                await gate.promise;
                attachments.emit([attachment]);
                bindings.emit([binding]);

                return {...attachment, role: binding.role};
            },
        } as unknown as ScriptRepository;
        const store = createScriptAttachmentsStore(repository, 'script-1');

        await Promise.all([store.attachmentsCollection.preload(), store.bindingsCollection.preload()]);

        const upload = store.upload('music-1', 'integrated_score', {
            name: 'score.pdf',
            type: 'application/pdf',
            size: 3,
            blob: new Blob(['pdf']),
        });

        expect(store.attachmentsCollection.size).toBe(0);
        expect(store.bindingsCollection.size).toBe(0);

        gate.resolve();
        await upload;

        expect(store.attachmentsCollection.get(attachment.id)).toMatchObject(attachment);
        expect(store.bindingsCollection.get('music-1:integrated_score')).toMatchObject(binding);
    });
});

import type {CloudApi} from './cloudApi';
import type {AttachmentFiles, CloudSyncStore} from './types';

/*
 * Attachment blobs next to the script docs: metadata syncs in the meta doc,
 * blobs go to object storage through presigned URLs from the collab service.
 * - upload: after a script synced, every attachment not marked uploaded whose
 *   blob is on this device (a durable queue: unmarked rows are retried)
 * - download: on demand when the app needs a blob it does not have; the
 *   content is checked against the attachment's SHA-256
 */

const sha256Hex = async (blob: Blob) => {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());

    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

export const createCloudAttachments = ({
    api,
    store,
    files,
    fetch: fetchImpl = (...args) => fetch(...args),
    log,
}: {
    api: CloudApi,
    store: CloudSyncStore,
    files: AttachmentFiles | undefined,
    fetch?: typeof fetch,
    log: (message: string, error?: unknown) => void,
}) => ({
    uploadPending: async (scriptId: string) => {
        if (!files) {
            return;
        }

        for (const attachment of await store.listPendingUploads(scriptId)) {
            const blob = await files.get(attachment.storageKey);

            // Metadata synced from elsewhere: the blob is not on this device.
            if (!blob) {
                continue;
            }

            try {
                const {url, headers} = await api.attachmentUploadUrl(scriptId, attachment.attachmentId, {mimeType: attachment.mimeType, size: blob.size});
                const response = await fetchImpl(url, {
                    method: 'PUT',
                    body: blob,
                    headers,
                });

                if (!response.ok) {
                    throw new Error(`upload failed (${response.status})`);
                }

                await store.markAttachmentUploaded(attachment.attachmentId, scriptId);
            } catch (error) {
                // Stays unmarked: retried after the next sync of the script.
                log(`attachment ${attachment.attachmentId} not uploaded`, error);
            }
        }
    },
    download: async (storageKey: string) => {
        const attachment = files ? await store.findAttachment(storageKey) : null;

        if (!files || !attachment) {
            return false;
        }

        const response = await fetchImpl(await api.attachmentDownloadUrl(attachment.scriptId, attachment.attachmentId));

        if (!response.ok) {
            return false;
        }

        const blob = await response.blob();

        if (attachment.sha256 && await sha256Hex(blob) !== attachment.sha256) {
            log(`attachment ${attachment.attachmentId} failed its checksum`);

            return false;
        }

        await files.put(storageKey, blob);
        await store.markAttachmentUploaded(attachment.attachmentId, attachment.scriptId);

        return true;
    },
});

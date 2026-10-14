import type {AccessTokenClaims} from '@stagistic/identity';
import type {Hono} from 'hono';

import {canWrite, getScriptRole} from './access';
import {
    ATTACHMENT_URL_TTL_SECONDS,
    type AttachmentStorage,
    isAllowedAttachment,
} from './attachmentStorage';
import type {CollabDatabase} from './database';
import {SCRIPT_ID} from './documentName';

/*
 * Presigned URLs for attachment blobs (`/scripts/:id/attachments/:attachmentId`):
 * - POST …/upload {mimeType, size}: editors and owners; type and size checked
 *   here and signed into the URL
 * - GET  …/download: any member
 */
export const registerAttachmentRoutes = (
    app: Hono<{Variables: {user: AccessTokenClaims}}>,
    {database, storage}: {database: CollabDatabase, storage: AttachmentStorage},
) => {
    const roleOf = async (scriptId: string, attachmentId: string, userId: string) => (
        SCRIPT_ID.test(scriptId) && SCRIPT_ID.test(attachmentId) ? getScriptRole(database.collab, scriptId, userId) : null
    );

    app.post('/scripts/:id/attachments/:attachmentId/upload', async context => {
        const {id, attachmentId} = context.req.param();
        const role = await roleOf(id, attachmentId, context.get('user').userId);

        // Attachment metadata lives in the meta doc: writing it needs the same right.
        if (!role || !canWrite(role, 'meta')) {
            return context.json({error: 'forbidden'}, 403);
        }

        const body: {mimeType?: unknown, size?: unknown} = await context.req.json<{mimeType?: unknown, size?: unknown}>().catch(() => ({}));
        const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
        const size = typeof body.size === 'number' ? body.size : -1;

        if (!isAllowedAttachment(mimeType, size)) {
            return context.json({error: 'unsupported_attachment'}, 422);
        }

        return context.json({...await storage.presignUpload(id, attachmentId, {mimeType, size}), expiresIn: ATTACHMENT_URL_TTL_SECONDS});
    });

    app.get('/scripts/:id/attachments/:attachmentId/download', async context => {
        const {id, attachmentId} = context.req.param();

        if (!await roleOf(id, attachmentId, context.get('user').userId)) {
            return context.json({error: 'forbidden'}, 403);
        }

        return context.json({url: await storage.presignDownload(id, attachmentId), expiresIn: ATTACHMENT_URL_TTL_SECONDS});
    });
};

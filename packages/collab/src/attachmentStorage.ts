import {AwsClient} from 'aws4fetch';

/*
 * Attachment blobs in a private S3 bucket (RustFS locally, UpCloud Object
 * Storage in production). Clients never get bucket credentials: they ask the
 * collab REST API for short-lived presigned URLs. Uploads sign content type and
 * length, so the bucket rejects anything else than what the server allowed.
 */

export interface AttachmentStorageConfig {
    /** Endpoint the server reaches (bucket admin, purge), e.g. `http://s3:9000`. */
    endpoint: string,
    /** Endpoint browsers reach; presigned URLs are signed for its host. */
    publicEndpoint: string,
    bucket: string,
    accessKeyId: string,
    secretAccessKey: string,
    region?: string,
}

export const ATTACHMENT_URL_TTL_SECONDS = 300;
export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

const ALLOWED_TYPES = [
    /^application\/pdf$/,
    /^audio\/(mpeg|mp4|aac|wav|x-wav|ogg|flac|webm)$/,
    /^image\/(png|jpeg|webp)$/,
];

export const isAllowedAttachment = (mimeType: string, size: number) => {
    const allowedType = ALLOWED_TYPES.some(type => type.test(mimeType));

    return allowedType && Number.isInteger(size) && size > 0 && size <= MAX_ATTACHMENT_BYTES;
};

export const attachmentKey = (scriptId: string, attachmentId: string) => `s/${scriptId}/a/${attachmentId}`;

export const createAttachmentStorage = (config: AttachmentStorageConfig) => {
    const client = new AwsClient({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        service: 's3',
        region: config.region ?? 'us-east-1',
    });
    const objectUrl = (endpoint: string, key: string) => new URL(`${endpoint.replace(/\/$/, '')}/${config.bucket}/${key}`);

    const presign = async (method: 'PUT' | 'GET', key: string, headers: Record<string, string> = {}) => {
        const url = objectUrl(config.publicEndpoint, key);

        url.searchParams.set('X-Amz-Expires', String(ATTACHMENT_URL_TTL_SECONDS));

        const signed = await client.sign(url, {
            method,
            headers,
            aws: {signQuery: true, allHeaders: true},
        });

        return signed.url;
    };

    const bucketUrl = `${config.endpoint.replace(/\/$/, '')}/${config.bucket}`;

    return {
        /** The client must send exactly these headers (the browser sets content-length from the body). */
        presignUpload: async (scriptId: string, attachmentId: string, {mimeType, size}: {mimeType: string, size: number}) => {
            const headers = {'content-type': mimeType, 'content-length': String(size)};

            return {url: await presign('PUT', attachmentKey(scriptId, attachmentId), headers), headers: {'content-type': mimeType}};
        },
        presignDownload: (scriptId: string, attachmentId: string) => presign('GET', attachmentKey(scriptId, attachmentId)),
        /** Creates the bucket if needed and allows the app origins (CORS) to PUT/GET. */
        ensureBucket: async (appOrigins: readonly string[]) => {
            const created = await client.fetch(bucketUrl, {method: 'PUT'});

            if (!created.ok && created.status !== 409) {
                throw new Error(`[collab] could not create bucket ${config.bucket} (${created.status})`);
            }

            if (appOrigins.length === 0) {
                return;
            }

            const origins = appOrigins.map(origin => `<AllowedOrigin>${origin}</AllowedOrigin>`).join('');
            const cors = await client.fetch(`${bucketUrl}?cors`, {
                method: 'PUT',
                headers: {'content-type': 'application/xml'},
                body: `<CORSConfiguration><CORSRule>${origins}<AllowedMethod>PUT</AllowedMethod><AllowedMethod>GET</AllowedMethod>`
                    + '<AllowedHeader>content-type</AllowedHeader><ExposeHeader>ETag</ExposeHeader><MaxAgeSeconds>600</MaxAgeSeconds></CORSRule></CORSConfiguration>',
            });

            if (!cors.ok) {
                throw new Error(`[collab] could not set bucket CORS (${cors.status})`);
            }
        },
        /** Deletes every object of a script (purge). */
        deleteScript: async (scriptId: string) => {
            const prefix = `s/${scriptId}/`;
            let deleted = 0;

            for (;;) {
                const list = await client.fetch(`${bucketUrl}?list-type=2&prefix=${encodeURIComponent(prefix)}`);
                const keys = [...(await list.text()).matchAll(/<Key>([^<]+)<\/Key>/g)].map(match => match[1]);

                if (keys.length === 0) {
                    return deleted;
                }

                for (const key of keys) {
                    await client.fetch(`${bucketUrl}/${key}`, {method: 'DELETE'});
                    deleted++;
                }
            }
        },
    };
};

export type AttachmentStorage = ReturnType<typeof createAttachmentStorage>;

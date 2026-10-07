/*
 * Presigned PUT/GET round trip against the local S3 (RustFS) with aws4fetch,
 * using the planned key layout `s/{scriptId}/a/{attachmentId}` and a 5 min TTL.
 */
import {createHash, randomBytes} from 'node:crypto';

import {AwsClient} from 'aws4fetch';

const S3_URL = process.env.S3_URL ?? 'http://localhost:9000';
const BUCKET = 'spike-attachments';
const client = new AwsClient({
    accessKeyId: 'spike',
    secretAccessKey: 'spike-secret',
    service: 's3',
    region: 'eu-central-1',
});

const presign = async (method: 'PUT' | 'GET', key: string, headers: Record<string, string> = {}) => {
    const url = new URL(`${S3_URL}/${BUCKET}/${key}`);

    url.searchParams.set('X-Amz-Expires', '300');

    const signed = await client.sign(url, {
        method,
        headers,
        aws: {signQuery: true},
    });

    return signed.url;
};

await client.fetch(`${S3_URL}/${BUCKET}`, {method: 'PUT'});

const body = randomBytes(1024 * 1024);
const sha256 = createHash('sha256').update(body).digest('hex');
const key = 's/script-1/a/attachment-1';
const start = performance.now();
const put = await fetch(await presign('PUT', key, {'content-type': 'application/pdf'}), {
    method: 'PUT',
    body,
    headers: {'content-type': 'application/pdf'},
});
const putMs = performance.now() - start;
const get = await fetch(await presign('GET', key));
const roundTrip = createHash('sha256').update(new Uint8Array(await get.arrayBuffer())).digest('hex');
const unsigned = await fetch(`${S3_URL}/${BUCKET}/${key}`);

console.log(JSON.stringify({
    putStatus: put.status,
    putMs: Math.round(putMs),
    getStatus: get.status,
    shaMatches: roundTrip === sha256,
    unsignedGetStatus: unsigned.status,
}));

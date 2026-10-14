import {createAccessTokenVerifier} from '@stagistic/identity';
import {AwsClient} from 'aws4fetch';
import {
    type CryptoKey,
    exportJWK,
    generateKeyPair,
    SignJWT,
} from 'jose';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {attachmentKey, createAttachmentStorage} from './attachmentStorage';
import {type CollabDatabase, createCollabDatabase} from './database';
import {runCollabMigrations} from './migrations';
import {purgeDeletedScripts} from './purge';
import {createCollabApp} from './rest';

/*
 * Attachments against the local RustFS and Postgres (docker-compose.dev.yml).
 * Skipped when either is not running.
 */
const DATABASE_URL = process.env.COLLAB_TEST_DATABASE_URL ?? 'postgres://stagistic:stagistic@localhost:5432/stagistic_test';
const S3_URL = process.env.COLLAB_TEST_S3_URL ?? 'http://localhost:9000';
const RUN = `a${Date.now().toString(36)}`;
const ISSUER = 'https://auth.api.stagistic.local';
const AUDIENCE = 'https://sync.api.stagistic.local';
const EDITOR = 'https://editor.stagistic.local';

const probe = createCollabDatabase({connectionString: DATABASE_URL, max: 1});
const hasPostgres = await probe.collab.query('select 1').then(() => true, () => false);

await probe.end();

const hasS3 = await fetch(S3_URL).then(() => true, () => false);

describe.skipIf(!hasPostgres || !hasS3)('attachments', () => {
    let database: CollabDatabase;
    let app: ReturnType<typeof createCollabApp>;
    let privateKey: CryptoKey;
    const storage = createAttachmentStorage({
        endpoint: S3_URL,
        publicEndpoint: S3_URL,
        bucket: `attachments-${RUN}`,
        accessKeyId: 'stagistic',
        secretAccessKey: 'stagistic-secret',
    });

    const tokenFor = (userId: string) => new SignJWT({email: `${userId}@example.com`})
        .setProtectedHeader({alg: 'EdDSA', kid: 'k1'})
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(userId)
        .setExpirationTime('5m')
        .sign(privateKey);

    const api = async (userId: string, path: string, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);

        headers.set('authorization', `Bearer ${await tokenFor(userId)}`);

        if (init.body) {
            headers.set('content-type', 'application/json');
        }

        return app.request(path, {...init, headers});
    };

    const uploadUrl = (userId: string, scriptId: string, attachmentId: string, body: {mimeType: string, size: number}) => api(
        userId,
        `/scripts/${scriptId}/attachments/${attachmentId}/upload`,
        {method: 'POST', body: JSON.stringify(body)},
    );

    beforeAll(async () => {
        const keys = await generateKeyPair('EdDSA');

        privateKey = keys.privateKey;

        const jwk = {
            ...await exportJWK(keys.publicKey),
            kid: 'k1',
            alg: 'EdDSA',
        };

        database = createCollabDatabase({
            connectionString: DATABASE_URL,
            collabSchema: `collab_${RUN}`,
            projectionSchema: `projection_${RUN}`,
        });
        await runCollabMigrations(database);
        await storage.ensureBucket([EDITOR]);
        app = createCollabApp({
            database,
            verifyAccessToken: createAccessTokenVerifier({
                issuer: ISSUER,
                audience: AUDIENCE,
                jwks: {keys: [jwk]},
            }),
            appOrigins: [EDITOR],
            attachments: storage,
        });
        await api('alice', '/scripts', {method: 'POST', body: JSON.stringify({id: 'att-1', title: 'Score'})});
        await database.collab.query('insert into script_members (script_id, user_id, role) values ($1, \'vera\', \'viewer\')', ['att-1']);
    });

    afterAll(async () => {
        await database?.collab.query(`drop schema if exists "collab_${RUN}" cascade`);
        await database?.projection.query(`drop schema if exists "projection_${RUN}" cascade`);
        await database?.end();
    });

    it('uploads and downloads through presigned URLs only', async () => {
        const blob = new Blob([new Uint8Array(2048).fill(7)], {type: 'application/pdf'});
        const signed = await (await uploadUrl('alice', 'att-1', 'f1', {mimeType: 'application/pdf', size: blob.size})).json() as {url: string, headers: Record<string, string>};

        expect((await fetch(signed.url, {
            method: 'PUT',
            body: blob,
            headers: signed.headers,
        })).status).toBe(200);

        const {url} = await (await api('vera', '/scripts/att-1/attachments/f1/download')).json() as {url: string};
        const downloaded = new Uint8Array(await (await fetch(url)).arrayBuffer());

        expect(downloaded).toEqual(new Uint8Array(2048).fill(7));
        // Without a signature the bucket stays private.
        expect((await fetch(`${S3_URL}/attachments-${RUN}/${attachmentKey('att-1', 'f1')}`)).status).toBe(403);
    });

    it('signs type and size into the upload: a different body is rejected', async () => {
        const signed = await (await uploadUrl('alice', 'att-1', 'f2', {mimeType: 'application/pdf', size: 10})).json() as {url: string, headers: Record<string, string>};

        expect((await fetch(signed.url, {
            method: 'PUT',
            body: new Uint8Array(500),
            headers: signed.headers,
        })).ok).toBe(false);
        expect((await fetch(signed.url, {
            method: 'PUT',
            body: new Uint8Array(10),
            headers: {'content-type': 'audio/mpeg'},
        })).ok).toBe(false);
    });

    it('checks role, type and size before signing', async () => {
        expect((await uploadUrl('vera', 'att-1', 'f3', {mimeType: 'application/pdf', size: 10})).status).toBe(403);
        expect((await uploadUrl('mallory', 'att-1', 'f3', {mimeType: 'application/pdf', size: 10})).status).toBe(403);
        expect((await uploadUrl('alice', 'att-1', 'f3', {mimeType: 'text/html', size: 10})).status).toBe(422);
        expect((await uploadUrl('alice', 'att-1', 'f3', {mimeType: 'application/pdf', size: 500 * 1024 * 1024})).status).toBe(422);
        expect((await api('mallory', '/scripts/att-1/attachments/f1/download')).status).toBe(403);
    });

    it('deletes the blobs when a deleted script is purged', async () => {
        await database.collab.query('update scripts set deleted_at = now() - interval \'31 days\' where id = $1', ['att-1']);

        expect(await purgeDeletedScripts(database, 30, storage)).toEqual(['att-1']);

        const admin = new AwsClient({
            accessKeyId: 'stagistic',
            secretAccessKey: 'stagistic-secret',
            service: 's3',
            region: 'us-east-1',
        });
        const listing = await (await admin.fetch(`${S3_URL}/attachments-${RUN}?list-type=2&prefix=s/att-1/`)).text();

        expect(listing).not.toContain('<Key>');
    });
});

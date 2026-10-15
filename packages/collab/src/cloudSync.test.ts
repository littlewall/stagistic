import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';

import type {Hocuspocus} from '@hocuspocus/server';
import {createAccessTokenVerifier} from '@stagistic/identity';
import {
    COPY_SUFFIX,
    createMemoryDocPersistence,
    createSyncEngine,
    createSyncEngineClient,
    getBodyFragment,
    type SyncEngine,
    type SyncEngineClient,
} from '@stagistic/sync-engine';
import {block, doc} from '@stagistic/sync-engine/testing';
import {createMemoryCloudSyncStore, createMemoryProjectionStore} from '@stagistic/sync-engine/testing/engine';
import {
    type CryptoKey,
    exportJWK,
    generateKeyPair,
    SignJWT,
} from 'jose';
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import WebSocket, {WebSocketServer} from 'ws';
import * as Y from 'yjs';

import {createAttachmentStorage} from './attachmentStorage';
import {type CollabDatabase, createCollabDatabase} from './database';
import {createLocalEventBus} from './events';
import {createCollabHocuspocus} from './hocuspocus';
import {runCollabMigrations} from './migrations';
import {createCollabApp} from './rest';

/*
 * Client cloud sync end to end: two devices (engines with their own storage)
 * of one account against the real collab service (Hocuspocus + REST) and the
 * local Postgres. Skipped when Postgres is not running.
 */
const DATABASE_URL = process.env.COLLAB_TEST_DATABASE_URL ?? 'postgres://stagistic:stagistic@localhost:5432/stagistic_test';
const RUN = `c${Date.now().toString(36)}`;
const AUTH = 'https://auth.api.stagistic.local';
const SYNC = 'https://sync.api.stagistic.local';
const SCHEMA = 4;

const S3_URL = process.env.COLLAB_TEST_S3_URL ?? 'http://localhost:9000';
const hasS3 = await fetch(S3_URL).then(() => true, () => false);
const storage = createAttachmentStorage({
    endpoint: S3_URL,
    publicEndpoint: S3_URL,
    bucket: `sync-${RUN}`,
    accessKeyId: 'stagistic',
    secretAccessKey: 'stagistic-secret',
});

const probe = createCollabDatabase({connectionString: DATABASE_URL, max: 1});
const available = await probe.collab.query('select 1').then(() => true, () => false);

await probe.end();

const eventually = async (check: () => Promise<boolean> | boolean, timeoutMs = 15_000) => {
    const deadline = Date.now() + timeoutMs;

    while (!await check()) {
        if (Date.now() > deadline) {
            throw new Error('condition not met in time');
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }
};

const texts = (document: {content: Array<{content?: Array<{text?: string}>}>} | undefined) => document?.content.map(node => node.content?.[0]?.text ?? '') ?? [];

const setDialogue = (body: Y.Doc, index: number, text: string) => {
    const element = getBodyFragment(body).get(index) as Y.XmlElement;
    const run = element.get(0) as Y.XmlText;

    body.transact(() => {
        run.delete(0, run.length);
        run.insert(0, text);
    });
};

describe.skipIf(!available)('client cloud sync', () => {
    let database: CollabDatabase;
    let hocuspocus: Hocuspocus;
    let app: ReturnType<typeof createCollabApp>;
    let server: Server;
    let wsUrl: string;
    let privateKey: CryptoKey;
    const cleanups: Array<() => Promise<void> | void> = [];

    const tokenFor = (userId: string) => new SignJWT({email: `${userId}@example.com`})
        .setProtectedHeader({alg: 'EdDSA', kid: 'k1'})
        .setIssuer(AUTH)
        .setAudience(SYNC)
        .setSubject(userId)
        .setExpirationTime('5m')
        .sign(privateKey);

    beforeAll(async () => {
        const keys = await generateKeyPair('EdDSA');

        privateKey = keys.privateKey;

        const jwk = {
            ...await exportJWK(keys.publicKey),
            kid: 'k1',
            alg: 'EdDSA',
        };
        const verifyAccessToken = createAccessTokenVerifier({
            issuer: AUTH,
            audience: SYNC,
            jwks: {keys: [jwk]},
        });

        database = createCollabDatabase({
            connectionString: DATABASE_URL,
            collabSchema: `collab_${RUN}`,
            projectionSchema: `projection_${RUN}`,
        });
        await runCollabMigrations(database);

        if (hasS3) {
            await storage.ensureBucket([]);
        }

        const events = createLocalEventBus();

        hocuspocus = createCollabHocuspocus({
            database,
            verifyAccessToken,
            debounceMs: 50,
            events,
        });
        app = createCollabApp({
            database,
            verifyAccessToken,
            appOrigins: [],
            attachments: hasS3 ? storage : undefined,
            hocuspocus,
            events,
        });
        server = createServer();

        const sockets = new WebSocketServer({server});

        sockets.on('connection', (socket, request) => {
            const connection = hocuspocus.handleConnection(socket, new Request(`http://localhost${request.url ?? '/'}`));

            socket.on('message', data => connection.handleMessage(new Uint8Array(data as Buffer)));
            socket.on('close', (code, reason) => connection.handleClose({code, reason: reason.toString()}));
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
        wsUrl = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        for (const cleanup of cleanups.splice(0).reverse()) {
            await cleanup();
        }
    });

    afterAll(async () => {
        server?.close();
        await database?.collab.query(`drop schema if exists "collab_${RUN}" cascade`);
        await database?.projection.query(`drop schema if exists "projection_${RUN}" cascade`);
        await database?.end();
    });

    /** One browser profile: engine (leader) + a tab client, signed in as `userId`. */
    const createDevice = (userId: string) => {
        const ns = crypto.randomUUID();
        const channels = {
            controlChannelFactory: () => new BroadcastChannel(`${ns}:engine`) as never,
            docChannelFactory: (name: string) => new BroadcastChannel(`${ns}:${name}`) as never,
        };
        const projection = createMemoryProjectionStore();
        const files = new Map<string, Blob>();
        const cloudStore = createMemoryCloudSyncStore(projection);
        const session = {signedIn: true};
        const fetchImpl: typeof fetch = async (input, init) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

            if (url.startsWith(AUTH)) {
                return session.signedIn ? Response.json({token: await tokenFor(userId)}) : new Response('', {status: 401});
            }

            // Presigned object URLs go to the real bucket.
            return url.startsWith(SYNC) ? app.request(url, init) : fetch(input, init);
        };
        const engine: SyncEngine = createSyncEngine({
            ...channels,
            store: projection.store,
            persistence: createMemoryDocPersistence(),
            clientSchemaVersion: SCHEMA,
            projectionDelayMs: 10,
            cloud: {
                authUrl: AUTH,
                syncUrl: SYNC,
                wsUrl,
                store: cloudStore.store,
                files: {
                    get: key => Promise.resolve(files.get(key) ?? null),
                    put: (key, blob) => {
                        files.set(key, blob);

                        return Promise.resolve();
                    },
                },
                WebSocketPolyfill: WebSocket,
                fetch: fetchImpl,
                pullIntervalMs: 200,
            },
        });
        const client: SyncEngineClient = createSyncEngineClient({...channels, retryMs: 50});

        cleanups.push(() => engine.stop(), () => client.destroy());

        const addScript = (scriptId: string, title: string, text: string) => {
            projection.documents.set(scriptId, doc(block('scene', `${scriptId}-h1`, 'INT. HALL'), block('dialogue', `${scriptId}-d1`, text)));
            cloudStore.titles.set(scriptId, title);
            cloudStore.touch(scriptId, 1);
        };
        const signIn = async () => {
            session.signedIn = true;
            await client.cloud.signedIn();
        };
        const signOut = async () => {
            session.signedIn = false;
            await client.cloud.signedOut();
        };
        /** Waits for the status to settle into `state`. */
        const waitFor = (state: string) => eventually(async () => (await client.cloud.status()).state === state);

        return {
            engine,
            client,
            projection,
            cloudStore,
            files,
            addScript,
            signIn,
            signOut,
            waitFor,
        };
    };

    it('uploads on the first device, downloads on the second, then syncs live', async () => {
        const a = createDevice('u1');

        a.addScript('s1', 'Hamlet', 'Hello');
        await a.waitFor('needs-check');

        const report = await a.client.cloud.check();

        expect(report).toMatchObject({
            upload: 1,
            download: 0,
            conflicts: [],
        });
        await a.client.cloud.apply({});
        await a.waitFor('synced');

        const b = createDevice('u1');

        await b.waitFor('needs-check');
        expect(await b.client.cloud.check()).toMatchObject({upload: 0, download: 1});
        await b.client.cloud.apply({});
        await eventually(() => texts(b.projection.documents.get('s1')).includes('Hello'));
        expect(b.cloudStore.titles.get('s1')).toBe('Hamlet');

        // Live: an edit in A's open tab reaches B through the background sync.
        const tab = await a.client.openScript('s1');

        setDialogue(tab.body, 1, 'Hello there');
        await eventually(() => texts(b.projection.documents.get('s1')).includes('Hello there'));
        tab.release();
    });

    it('resolves a script changed on both sides: keep both, then use newer', async () => {
        const a = createDevice('u2');

        a.addScript('k1', 'Lear', 'Original');
        a.addScript('n1', 'Macbeth', 'Original');
        await a.waitFor('needs-check');
        await a.client.cloud.check();
        await a.client.cloud.apply({});
        await a.waitFor('synced');

        const b = createDevice('u2');

        await b.waitFor('needs-check');
        await b.client.cloud.check();
        await b.client.cloud.apply({});
        await eventually(() => texts(b.projection.documents.get('n1')).includes('Original'));

        // A goes offline (signed out) and edits; B edits the same lines while live.
        await a.signOut();

        const aTab = await a.client.openScript('k1');
        const aTab2 = await a.client.openScript('n1');

        setDialogue(aTab.body, 1, 'A version');
        setDialogue(aTab2.body, 1, 'A newer version');
        a.cloudStore.touch('k1', 10);
        a.cloudStore.touch('n1', Date.now() + 60_000);

        const bTab = await b.client.openScript('k1');
        const bTab2 = await b.client.openScript('n1');

        setDialogue(bTab.body, 1, 'B version');
        setDialogue(bTab2.body, 1, 'B version');
        await eventually(async () => {
            const {rows} = await database.collab.query<{n: string}>('select count(*) as n from ydoc_states where script_id in ($1, $2)', ['k1', 'n1']);

            return Number(rows[0].n) === 6;
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        const resets: string[][] = [];

        a.client.onScriptsReset(ids => resets.push(ids));
        await a.signIn();
        await a.waitFor('needs-check');

        const report = await a.client.cloud.check();

        expect(report.conflicts.map(conflict => conflict.scriptId).sort()).toEqual(['k1', 'n1']);
        expect(report.conflicts.find(conflict => conflict.scriptId === 'k1')).toMatchObject({differingScenes: 1, newer: 'cloud'});
        expect(report.conflicts.find(conflict => conflict.scriptId === 'n1')).toMatchObject({newer: 'local'});

        await a.client.cloud.apply({k1: 'keep-both', n1: 'use-newer'});

        // Keep both: the original follows the cloud, the local version became a copy.
        await eventually(() => texts(a.projection.documents.get('k1')).includes('B version'));

        const copyId = [...a.cloudStore.titles].find(([, title]) => title === `Lear${COPY_SUFFIX}`)?.[0];

        expect(copyId).toBeTruthy();
        expect(texts(a.projection.documents.get(copyId!))).toContain('A version');
        expect(resets.flat().sort()).toEqual(['k1', 'n1']);

        // Use newer (local): B receives A's version as an ordinary change, without duplicates.
        await eventually(() => texts(b.projection.documents.get('n1')).includes('A newer version'));
        expect(b.projection.documents.get('n1')?.content).toHaveLength(2);
        expect((await (await app.request('/scripts', {headers: {authorization: `Bearer ${await tokenFor('u2')}`}})).json() as {scripts: Array<{title: string}>}).scripts
            .map(script => script.title)).toContain(`Lear${COPY_SUFFIX}`);

        aTab.release();
        aTab2.release();
        bTab.release();
        bTab2.release();
    });

    it('learns about new and deleted scripts from hints, without polling', async () => {
        const a = createDevice('u4');
        const b = createDevice('u4');

        for (const device of [a, b]) {
            await device.waitFor('needs-check');
            await device.client.cloud.check();
            await device.client.cloud.apply({});
            await device.waitFor('synced');
        }

        // A creates a script while both are live: B gets an `added` hint and downloads it.
        a.addScript('h1', 'Othello', 'Hint');
        await a.client.cloud.wake();
        await eventually(() => texts(b.projection.documents.get('h1')).includes('Hint'));

        // A deletes it: B gets a `deleted` hint and deletes it too (unchanged there).
        a.projection.documents.delete('h1');
        a.cloudStore.titles.delete('h1');
        await a.client.notifyScriptDeleted('h1');
        await eventually(() => !b.projection.documents.has('h1'));
    });

    it('uploads a script created and opened while signed in, without waiting for a library pass', async () => {
        const a = createDevice('u6');
        const b = createDevice('u6');

        for (const device of [a, b]) {
            await device.waitFor('needs-check');
            await device.client.cloud.check();
            await device.client.cloud.apply({});
            await device.waitFor('synced');
        }

        // New on A and opened in a tab right away: registered before it attaches (else Hocuspocus refuses it).
        a.addScript('o1', 'Macbeth', 'Thunder');

        const tab = await a.client.openScript('o1');

        setDialogue(tab.body, 1, 'Thunder and lightning');
        await eventually(() => texts(b.projection.documents.get('o1')).includes('Thunder and lightning'));
        tab.release();
    });

    it.skipIf(!hasS3)('uploads attachment blobs after sync and downloads them on demand elsewhere', async () => {
        const a = createDevice('u5');
        const blob = new Blob([new Uint8Array(3000).fill(9)], {type: 'application/pdf'});
        const sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())).toString('hex');

        a.addScript('p1', 'Carmen', 'Overture');
        a.files.set('local-key-1', blob);
        a.projection.setRecords('p1', 'meta', {
            attachments: {
                att1: {
                    filename: 'score.pdf',
                    mimeType: 'application/pdf',
                    sizeBytes: blob.size,
                    storageKey: 'local-key-1',
                    sha256,
                    createdAt: 1,
                },
            },
        });
        await a.waitFor('needs-check');
        await a.client.cloud.check();
        await a.client.cloud.apply({});
        await eventually(() => a.cloudStore.uploaded.has('att1'));

        const b = createDevice('u5');

        await b.waitFor('needs-check');
        await b.client.cloud.check();
        await b.client.cloud.apply({});
        await eventually(() => b.projection.readRecordsOf('p1', 'meta').attachments?.att1 !== undefined);
        expect(b.files.has('local-key-1')).toBe(false);

        expect(await b.client.cloud.downloadAttachment('local-key-1')).toBe(true);
        expect(new Uint8Array(await b.files.get('local-key-1')!.arrayBuffer())).toEqual(new Uint8Array(3000).fill(9));
    });

    it('deletes in the cloud when a synced script is deleted locally', async () => {
        const a = createDevice('u3');

        a.addScript('d1', 'Tempest', 'Storm');
        await a.waitFor('needs-check');
        await a.client.cloud.check();
        await a.client.cloud.apply({});
        await a.waitFor('synced');

        a.projection.documents.delete('d1');
        a.cloudStore.titles.delete('d1');
        await a.client.notifyScriptDeleted('d1');

        await eventually(async () => {
            const {rows} = await database.collab.query<{deleted_at: Date | null}>('select deleted_at from scripts where id = $1', ['d1']);

            return rows[0]?.deleted_at !== null;
        });
    });
});

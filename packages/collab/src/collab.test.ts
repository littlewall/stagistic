import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';

import {HocuspocusProvider, HocuspocusProviderWebsocket} from '@hocuspocus/provider';
import type {Hocuspocus} from '@hocuspocus/server';
import {createAccessTokenVerifier} from '@stagistic/identity';
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
import WebSocket, {WebSocketServer} from 'ws';
import * as Y from 'yjs';

import {type CollabDatabase, createCollabDatabase} from './database';
import {createCollabHocuspocus} from './hocuspocus';
import {runCollabMigrations} from './migrations';
import {purgeDeletedScripts} from './purge';
import {createCollabApp} from './rest';

/*
 * Integration tests against the local Postgres from docker-compose.dev.yml
 * (`stagistic_test`, own schemas per run). Skipped when it is not running.
 */
const DATABASE_URL = process.env.COLLAB_TEST_DATABASE_URL ?? 'postgres://stagistic:stagistic@localhost:5432/stagistic_test';
const RUN = Date.now().toString(36);
const ISSUER = 'https://auth.api.stagistic.local';
const AUDIENCE = 'https://sync.api.stagistic.local';
const EDITOR = 'https://editor.stagistic.local';

const probe = createCollabDatabase({connectionString: DATABASE_URL, max: 1});
const available = await probe.collab.query('select 1').then(() => true, () => false);

await probe.end();

if (!available) {
    console.warn(`[collab] skipping integration tests: no Postgres at ${DATABASE_URL} (docker compose -f docker-compose.dev.yml up -d postgres)`);
}

const eventually = async (check: () => Promise<boolean> | boolean, timeoutMs = 10_000) => {
    const deadline = Date.now() + timeoutMs;

    while (!await check()) {
        if (Date.now() > deadline) {
            throw new Error('condition not met in time');
        }

        await new Promise(resolve => setTimeout(resolve, 25));
    }
};

const setRecord = (doc: Y.Doc, collection: string, id: string, fields: Record<string, unknown>) => {
    const record = new Y.Map<unknown>();

    Object.entries(fields).forEach(([key, value]) => record.set(key, value));
    doc.getMap<Y.Map<unknown>>(collection).set(id, record);
};

describe.skipIf(!available)('collab service', () => {
    let database: CollabDatabase;
    let hocuspocus: Hocuspocus;
    let app: ReturnType<typeof createCollabApp>;
    let server: Server;
    let url: string;
    let privateKey: CryptoKey;
    const providers: HocuspocusProvider[] = [];

    const tokenFor = (userId: string) => new SignJWT({email: `${userId}@example.com`})
        .setProtectedHeader({alg: 'EdDSA', kid: 'k1'})
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(userId)
        .setExpirationTime('5m')
        .sign(privateKey);

    const api = async (userId: string | null, path: string, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);

        if (userId) {
            headers.set('authorization', `Bearer ${await tokenFor(userId)}`);
        }

        if (init.body) {
            headers.set('content-type', 'application/json');
        }

        return app.request(path, {...init, headers});
    };

    const register = (userId: string, id: string, title = 'Hamlet') => api(userId, '/scripts', {method: 'POST', body: JSON.stringify({id, title})});

    /** Connects a provider; resolves once synced, rejects on auth failure. */
    type Connected = {provider: HocuspocusProvider, document: Y.Doc};

    const connect = (userId: string, name: string, document = new Y.Doc()) => new Promise<Connected>((resolve, reject) => {
        const socket = new HocuspocusProviderWebsocket({url, WebSocketPolyfill: WebSocket});
        const provider = new HocuspocusProvider({
            name,
            document,
            websocketProvider: socket,
            token: () => tokenFor(userId),
            onSynced: () => resolve({provider, document}),
            onAuthenticationFailed: ({reason}) => reject(new Error(reason)),
        });

        providers.push(provider);
        provider.attach();
    });

    beforeAll(async () => {
        const keys = await generateKeyPair('EdDSA');

        privateKey = keys.privateKey;

        const jwk = {
            ...await exportJWK(keys.publicKey),
            kid: 'k1',
            alg: 'EdDSA',
        };
        const verifyAccessToken = createAccessTokenVerifier({
            issuer: ISSUER,
            audience: AUDIENCE,
            jwks: {keys: [jwk]},
        });

        database = createCollabDatabase({
            connectionString: DATABASE_URL,
            collabSchema: `collab_test_${RUN}`,
            projectionSchema: `projection_test_${RUN}`,
        });
        await runCollabMigrations(database);
        hocuspocus = createCollabHocuspocus({
            database,
            verifyAccessToken,
            debounceMs: 50,
        });
        app = createCollabApp({
            database,
            verifyAccessToken,
            appOrigins: [EDITOR],
            hocuspocus,
        });

        server = createServer();

        const sockets = new WebSocketServer({server});

        sockets.on('connection', (socket, request) => {
            const connection = hocuspocus.handleConnection(socket, new Request(`http://localhost${request.url ?? '/'}`));

            socket.on('message', data => connection.handleMessage(new Uint8Array(data as Buffer)));
            socket.on('close', (code, reason) => connection.handleClose({code, reason: reason.toString()}));
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
        url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
        providers.forEach(provider => provider.destroy());
        server?.close();
        await database?.collab.query(`drop schema if exists "collab_test_${RUN}" cascade`);
        await database?.projection.query(`drop schema if exists "projection_test_${RUN}" cascade`);
        await database?.end();
    });

    it('registers, lists, soft-deletes and restores scripts per user', async () => {
        const created = await register('alice', 'rest-1');

        expect(created.status).toBe(201);
        expect(created.headers.get('date')).toBeTruthy();
        expect((await register('alice', 'rest-1')).status).toBe(200);
        expect((await register('bob', 'rest-1')).status).toBe(403);
        expect((await register('alice', 'bad id!')).status).toBe(400);
        expect((await api(null, '/scripts')).status).toBe(401);

        const list = async (userId: string) => ((await (await api(userId, '/scripts')).json()) as {scripts: Array<{
            id: string,
            role: string,
            deletedAt: string | null,
        }>,}).scripts;

        expect((await list('alice')).find(item => item.id === 'rest-1')).toMatchObject({role: 'owner', deletedAt: null});
        expect(await list('bob')).toEqual([]);

        expect((await api('bob', '/scripts/rest-1', {method: 'DELETE'})).status).toBe(403);
        expect((await api('alice', '/scripts/rest-1', {method: 'DELETE'})).status).toBe(204);
        expect((await list('alice')).find(item => item.id === 'rest-1')?.deletedAt).toBeTruthy();

        await register('alice', 'rest-1');
        expect((await list('alice')).find(item => item.id === 'rest-1')?.deletedAt).toBeNull();
    });

    it('persists docs, bumps updated_at and projects meta records into Postgres tables', async () => {
        await register('alice', 'doc-1');

        const before = (await database.collab.query<{updated_at: Date}>('select updated_at from scripts where id = $1', ['doc-1'])).rows[0].updated_at;
        const {document} = await connect('alice', 'script/doc-1/meta');

        document.transact(() => {
            setRecord(document, 'characters', 'c1', {
                key: 'HAMLET',
                kind: 'character',
                colorHex: '#ff0000',
                createdAt: 1,
            });
            setRecord(document, 'script', 'script', {title: 'The Tragedy of Hamlet', subtitle: null});
        });

        await eventually(async () => (await database.projection.query('select 1 from script_characters where id = $1', ['c1'])).rowCount === 1);

        const script = (await database.collab.query<{title: string, updated_at: Date}>('select title, updated_at from scripts where id = $1', ['doc-1'])).rows[0];

        expect(script.title).toBe('The Tragedy of Hamlet');
        expect(script.updated_at.getTime()).toBeGreaterThan(before.getTime());

        // A fresh client gets the stored state.
        const second = await connect('alice', 'script/doc-1/meta');

        expect(second.document.getMap<Y.Map<unknown>>('characters').get('c1')?.get('colorHex')).toBe('#ff0000');
    });

    it('rejects non-members and keeps viewers and commenters read-only where they may not write', async () => {
        await register('alice', 'acl-1');
        await database.collab.query(
            'insert into script_members (script_id, user_id, role) values ($1, \'vera\', \'viewer\'), ($1, \'cole\', \'commenter\')',
            ['acl-1'],
        );

        await expect(connect('mallory', 'script/acl-1/meta')).rejects.toThrow();

        const owner = await connect('alice', 'script/acl-1/meta');
        const viewer = await connect('vera', 'script/acl-1/meta');
        const commenter = await connect('cole', 'script/acl-1/comments');

        setRecord(viewer.document, 'locations', 'l1', {name: 'Hall', createdAt: 1});
        setRecord(commenter.document, 'threads', 't1', {status: 'open', createdAt: 1});

        await eventually(async () => (await database.projection.query('select 1 from script_comment_threads where id = $1', ['t1'])).rowCount === 1);
        await new Promise(resolve => setTimeout(resolve, 300));
        expect(owner.document.getMap('locations').has('l1')).toBe(false);
        expect((await database.projection.query('select 1 from script_locations where id = $1', ['l1'])).rowCount).toBe(0);
    });

    it('never lets a script take over another script\'s projected row with the same id', async () => {
        await register('alice', 'own-1');
        await register('mallory', 'evil-1');

        const own = await connect('alice', 'script/own-1/meta');

        setRecord(own.document, 'characters', 'shared-id', {
            key: 'HAMLET',
            kind: 'character',
            colorHex: '#00ff00',
            createdAt: 1,
        });
        await eventually(async () => (await database.projection.query('select 1 from script_characters where id = $1', ['shared-id'])).rowCount === 1);

        const evil = await connect('mallory', 'script/evil-1/meta');

        setRecord(evil.document, 'characters', 'shared-id', {
            key: 'PWNED',
            kind: 'character',
            colorHex: '#000000',
            createdAt: 1,
        });
        await eventually(async () => (await database.collab.query('select 1 from ydoc_states where name = $1', ['script/evil-1/meta'])).rowCount === 1);
        await new Promise(resolve => setTimeout(resolve, 300));

        const {rows} = await database.projection.query<{script_id: string, character_key: string}>('select script_id, character_key from script_characters where id = $1', ['shared-id']);

        expect(rows).toEqual([{script_id: 'own-1', character_key: 'HAMLET'}]);
    });

    it('purges scripts deleted more than 30 days ago with all their data', async () => {
        await register('alice', 'old-1');

        const {document} = await connect('alice', 'script/old-1/meta');

        setRecord(document, 'characters', 'c-old', {
            key: 'YORICK',
            kind: 'character',
            createdAt: 1,
        });
        await eventually(async () => (await database.collab.query('select 1 from ydoc_states where script_id = $1', ['old-1'])).rowCount === 1);
        await eventually(async () => (await database.projection.query('select 1 from script_characters where id = $1', ['c-old'])).rowCount === 1);

        await database.collab.query('update scripts set deleted_at = now() - interval \'31 days\' where id = $1', ['old-1']);

        expect(await purgeDeletedScripts(database)).toEqual(['old-1']);
        expect((await database.collab.query('select 1 from ydoc_states where script_id = $1', ['old-1'])).rowCount).toBe(0);
        expect((await database.projection.query('select 1 from script_characters where id = $1', ['c-old'])).rowCount).toBe(0);
    });
});

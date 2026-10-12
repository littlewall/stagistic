import {createServer, type Server} from 'node:http';
import type {AddressInfo} from 'node:net';

import {getMigrations} from 'better-auth/db/migration';
import type {JSONWebKeySet} from 'jose';
import type {Pool} from 'pg';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createAccessTokenVerifier} from './accessToken';
import {createIdentityApp} from './app';
import {createIdentityAuth, createIdentityAuthOptions} from './auth';
import type {IdentityConfig} from './config';
import {createIdentityPool} from './database';
import {createMemoryMailer} from './mailer';
import {runIdentityMigrations} from './migrate';

/*
 * Integration tests against the local Postgres from docker-compose.dev.yml
 * (`stagistic_test`, one schema per run). Skipped when it is not running.
 */
const DATABASE_URL = process.env.IDENTITY_TEST_DATABASE_URL ?? 'postgres://stagistic:stagistic@localhost:5432/stagistic_test';
const SCHEMA = `identity_test_${Date.now().toString(36)}`;
const AUTH = 'https://auth.api.stagistic.local';
const EDITOR = 'https://editor.stagistic.local';
const SYNC = 'https://sync.api.stagistic.local';

const probe = createIdentityPool({
    connectionString: DATABASE_URL,
    schema: SCHEMA,
    max: 1,
});
const available = await probe.query('SELECT 1').then(() => true, () => false);

await probe.end();

if (!available) {
    console.warn(`[identity] skipping integration tests: no Postgres at ${DATABASE_URL} (docker compose -f docker-compose.dev.yml up -d postgres)`);
}

/** Turnstile siteverify stand-in: the token "pass" passes. */
const startTurnstileStub = () => new Promise<Server>(resolve => {
    const server = createServer((request, response) => {
        let body = '';

        request.on('data', chunk => {
            body += String(chunk);
        });
        request.on('end', () => {
            response.setHeader('content-type', 'application/json');
            response.end(JSON.stringify({success: (JSON.parse(body) as {response?: string}).response === 'pass'}));
        });
    });

    server.listen(0, '127.0.0.1', () => resolve(server));
});

describe.skipIf(!available)('identity service', () => {
    let pool: Pool;
    let turnstile: Server;
    let app: ReturnType<typeof createIdentityApp>;
    let config: IdentityConfig;
    const mailer = createMemoryMailer();
    let ip = 0;

    beforeAll(async () => {
        turnstile = await startTurnstileStub();
        pool = createIdentityPool({connectionString: DATABASE_URL, schema: SCHEMA});
        await runIdentityMigrations(pool, SCHEMA);

        config = {
            baseURL: AUTH,
            secret: 'test-secret-0123456789abcdef0123456789',
            appOrigins: [EDITOR],
            cookieDomain: 'stagistic.local',
            turnstileSecretKey: 'test',
            turnstileVerifyURL: `http://127.0.0.1:${(turnstile.address() as AddressInfo).port}/siteverify`,
            jwtAudience: SYNC,
        };

        app = createIdentityApp({
            auth: createIdentityAuth({
                config,
                database: pool,
                mailer,
            }),
            config,
        });
    });

    afterAll(async () => {
        await pool?.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
        await pool?.end();
        turnstile?.close();
    });

    // A fresh client IP per test keeps rate limits independent.
    const request = (path: string, init: RequestInit & {
        captcha?: string,
        cookie?: string,
        clientIp?: string,
    } = {}) => {
        const headers = new Headers(init.headers);

        headers.set('origin', EDITOR);
        headers.set('x-forwarded-for', init.clientIp ?? `10.0.0.${++ip}`);

        if (init.captcha) {
            headers.set('x-captcha-response', init.captcha);
        }

        if (init.cookie) {
            headers.set('cookie', init.cookie);
        }

        if (init.body) {
            headers.set('content-type', 'application/json');
        }

        return app.request(`${AUTH}${path}`, {...init, headers});
    };

    const requestMagicLink = (email: string, captcha = 'pass', clientIp?: string) => request('/api/auth/sign-in/magic-link', {
        method: 'POST',
        body: JSON.stringify({email, callbackURL: `${EDITOR}/auth/callback`}),
        captcha,
        clientIp,
    });

    const signIn = async (email: string) => {
        expect((await requestMagicLink(email)).status).toBe(200);

        const link = new URL((/https:\/\/\S+/).exec(mailer.messages.at(-1)!.text)![0]);
        const verified = await request(`/api/auth/magic-link/verify?token=${link.searchParams.get('token')}`);
        const cookie = verified.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');

        return {
            link,
            verified,
            cookie,
            setCookie: verified.headers.getSetCookie(),
        };
    };

    it('emails a link into the app and signs in with a cookie shared by all subdomains', async () => {
        const {
            link,
            verified,
            cookie,
            setCookie,
        } = await signIn('hamlet@example.com');

        expect(link.origin).toBe(EDITOR);
        expect(link.pathname).toBe('/auth/callback');
        expect(verified.status).toBe(200);
        expect(setCookie.join('\n')).toMatch(/Domain=stagistic\.local/i);
        expect(setCookie.join('\n')).toMatch(/Secure/);

        const session = await (await request('/api/auth/get-session', {cookie})).json() as {user: {email: string}} | null;

        expect(session?.user.email).toBe('hamlet@example.com');
    });

    it('keeps nothing in the DB that signs in on its own', async () => {
        expect((await requestMagicLink('polonius@example.com')).status).toBe(200);

        const linkToken = new URL((/https:\/\/\S+/).exec(mailer.messages.at(-1)!.text)![0]).searchParams.get('token')!;
        const verifications = await pool.query<{identifier: string, value: string}>('select identifier, value from verification');

        // The magic link token is stored hashed only.
        expect(JSON.stringify(verifications.rows)).not.toContain(linkToken);

        await request(`/api/auth/magic-link/verify?token=${linkToken}`);

        // A session token read from the DB is not a valid cookie: it must be signed with the server secret.
        const {rows} = await pool.query<{token: string}>(
            'select s.token from session s join "user" u on u.id = s."userId" where u.email = $1',
            ['polonius@example.com'],
        );
        const forged = await request('/api/auth/get-session', {cookie: `__Secure-better-auth.session_token=${rows[0].token}`});

        expect(await forged.json()).toBeNull();
    });

    it('issues an access token that services verify via JWKS', async () => {
        const {cookie} = await signIn('ophelia@example.com');
        const {token} = await (await request('/api/auth/token', {cookie})).json() as {token: string};
        const jwks = await (await request('/api/auth/jwks')).json() as JSONWebKeySet;
        const verify = createAccessTokenVerifier({
            issuer: AUTH,
            audience: SYNC,
            jwks,
        });

        expect(await verify(token)).toMatchObject({email: 'ophelia@example.com'});
        await expect(createAccessTokenVerifier({
            issuer: AUTH,
            audience: 'https://other.api',
            jwks,
        })(token)).rejects.toThrow();
    });

    it('rejects a magic link request without a valid captcha', async () => {
        const sent = mailer.messages.length;

        expect((await requestMagicLink('horatio@example.com', 'fail')).status).toBe(403);
        expect(mailer.messages.length).toBe(sent);
    });

    it('allows credentialed CORS only for app origins', async () => {
        const allowed = await app.request(`${AUTH}/api/auth/get-session`, {
            method: 'OPTIONS',
            headers: {origin: EDITOR, 'access-control-request-method': 'GET'},
        });
        const denied = await app.request(`${AUTH}/api/auth/get-session`, {
            method: 'OPTIONS',
            headers: {origin: 'https://evil.example', 'access-control-request-method': 'GET'},
        });

        expect(allowed.headers.get('access-control-allow-origin')).toBe(EDITOR);
        expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
        expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('rate limits magic link requests per client', async () => {
        const statuses: number[] = [];

        for (let attempt = 0; attempt < 6; attempt++) {
            statuses.push((await requestMagicLink('laertes@example.com', 'pass', '10.9.9.9')).status);
        }

        expect(statuses.slice(0, 5)).toEqual([
            200,
            200,
            200,
            200,
            200,
        ]);
        expect(statuses[5]).toBe(429);
    });

    it('tracks applied migrations (running them again is a no-op)', async () => {
        expect(await runIdentityMigrations(pool, SCHEMA)).toEqual([]);
    });

    it('has a committed migration matching the Better Auth configuration', async () => {
        const pending = await getMigrations(createIdentityAuthOptions({
            config,
            database: pool,
            mailer,
        }));

        expect(pending.toBeCreated.map(table => table.table)).toEqual([]);
        expect(pending.toBeAdded.map(table => table.table)).toEqual([]);
    });
});

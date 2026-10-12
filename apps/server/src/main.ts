/*
 * Stagistic server: one Deno process, one port per role (auth, collab).
 * Roles share nothing in memory, only Postgres and JWTs, so each can run alone
 * (`SERVER_ROLES=collab`) behind the same image.
 */
import {
    createAccessTokenVerifier,
    createIdentityApp,
    createIdentityAuth,
    createIdentityPool,
    createMailpitMailer,
    type Mailer,
    readIdentityConfig,
    runIdentityMigrations,
} from '@stagistic/identity';

import {createCollabApp} from './collabApp';
import {parseServerRoles} from './roles';

const env = Deno.env.toObject();
const roles = parseServerRoles(env.SERVER_ROLES);
const required = (name: string) => env[name] || (() => {
    throw new Error(`[server] missing ${name}`);
})();
const servers: Array<{shutdown(): Promise<void>}> = [];
const cleanups: Array<() => Promise<void>> = [];

const createMailer = (): Mailer => {
    if (env.MAILPIT_URL) {
        return createMailpitMailer({baseUrl: env.MAILPIT_URL});
    }

    // Postmark adapter: phase 7.
    throw new Error('[server] no mailer configured (set MAILPIT_URL)');
};

if (roles.has('auth')) {
    const config = readIdentityConfig(env);
    const pool = createIdentityPool({connectionString: required('DATABASE_URL')});

    cleanups.push(() => pool.end());

    if (env.MIGRATE_ON_START === '1') {
        const applied = await runIdentityMigrations(pool);

        console.log(`[server] identity migrations: ${applied.length > 0 ? applied.join(', ') : 'up to date'}`);
    }

    const app = createIdentityApp({
        auth: createIdentityAuth({
            config,
            database: pool,
            mailer: createMailer(),
        }),
        config,
    });

    servers.push(Deno.serve({
        port: Number(env.AUTH_PORT ?? 8787),
        hostname: '0.0.0.0',
        onListen: ({port}) => console.log(`[server] auth on :${port} (${config.baseURL})`),
    }, app.fetch));
}

if (roles.has('collab')) {
    const authBaseURL = required('AUTH_BASE_URL');
    const verifyAccessToken = createAccessTokenVerifier({
        issuer: authBaseURL,
        audience: required('JWT_AUDIENCE'),
        // Internal URL when both roles share a host; the public one otherwise.
        jwksUrl: env.AUTH_JWKS_URL || `${authBaseURL}/api/auth/jwks`,
    });
    const app = createCollabApp({appOrigins: required('APP_ORIGINS').split(',').map(item => item.trim()), verifyAccessToken});

    servers.push(Deno.serve({
        port: Number(env.COLLAB_PORT ?? 8788),
        hostname: '0.0.0.0',
        onListen: ({port}) => console.log(`[server] collab on :${port}`),
    }, app.fetch));
}

const shutdown = async () => {
    await Promise.all(servers.map(server => server.shutdown()));
    await Promise.all(cleanups.map(cleanup => cleanup()));
    Deno.exit(0);
};

Deno.addSignalListener('SIGTERM', () => void shutdown());
Deno.addSignalListener('SIGINT', () => void shutdown());

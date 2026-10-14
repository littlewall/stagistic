/*
 * Stagistic server: one Deno process, one port per role (auth, collab).
 * Roles share nothing in memory, only Postgres and JWTs, so each can run alone
 * (`SERVER_ROLES=collab`) behind the same image.
 */
import {
    createAttachmentStorage,
    createCollabApp,
    createCollabDatabase,
    createCollabHocuspocus,
    createLocalEventBus,
    purgeDeletedScripts,
    runCollabMigrations,
} from '@stagistic/collab';
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

import {collabSocketHandler, collabSocketLimit} from './collabSocket';
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
    const database = createCollabDatabase({connectionString: required('DATABASE_URL')});

    cleanups.push(() => database.end());

    if (env.MIGRATE_ON_START === '1') {
        const applied = await runCollabMigrations(database);

        console.log(`[server] collab migrations: ${applied.length > 0 ? `${applied.length} applied` : 'up to date'}`);
    }

    // Change hints in process (one collab instance); Redis pub/sub once collab scales out.
    const events = createLocalEventBus();
    const appOrigins = required('APP_ORIGINS').split(',').map(item => item.trim());
    // Attachment blobs (presigned URLs); without S3 config attachments stay on devices.
    const attachments = env.S3_ENDPOINT
        ? createAttachmentStorage({
            endpoint: env.S3_ENDPOINT,
            publicEndpoint: required('S3_PUBLIC_ENDPOINT'),
            bucket: required('S3_BUCKET'),
            accessKeyId: required('S3_ACCESS_KEY'),
            secretAccessKey: required('S3_SECRET_KEY'),
            region: env.S3_REGION,
        })
        : undefined;

    if (attachments && env.MIGRATE_ON_START === '1') {
        await attachments.ensureBucket(appOrigins);
    }

    const hocuspocus = createCollabHocuspocus({
        database,
        verifyAccessToken,
        events,
    });
    const app = createCollabApp({
        database,
        verifyAccessToken,
        appOrigins,
        hocuspocus,
        events,
        attachments,
    });

    app.get('/ws', collabSocketLimit(), collabSocketHandler(hocuspocus));
    // Runs before the pool closes (cleanups run in reverse): store pending edits.
    cleanups.push(async () => {
        hocuspocus.flushPendingStores();
        hocuspocus.closeConnections();

        const deadline = Date.now() + 5_000;

        while (hocuspocus.getDocumentsCount() > 0 && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    });

    // Purge is idempotent, so concurrent instances need no lock.
    const purge = setInterval(() => {
        purgeDeletedScripts(database, undefined, attachments)
            .then(ids => ids.length > 0 && console.log(`[server] purged ${ids.length} deleted scripts`))
            .catch(error => console.error('[server] purge failed', error));
    }, 60 * 60 * 1000);

    cleanups.push(() => {
        clearInterval(purge);

        return Promise.resolve();
    });
    servers.push(Deno.serve({
        port: Number(env.COLLAB_PORT ?? 8788),
        hostname: '0.0.0.0',
        onListen: ({port}) => console.log(`[server] collab on :${port}`),
    }, app.fetch));
}

const shutdown = async () => {
    await Promise.all(servers.map(server => server.shutdown()));
    for (const cleanup of cleanups.reverse()) {
        await cleanup();
    }

    Deno.exit(0);
};

Deno.addSignalListener('SIGTERM', () => void shutdown());
Deno.addSignalListener('SIGINT', () => void shutdown());

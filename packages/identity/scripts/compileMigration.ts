/*
 * Prints the SQL Better Auth needs on top of `DATABASE_URL`'s current schema
 * (run against an empty schema to produce a full migration). Usage (Deno):
 *   DATABASE_URL=... deno run -A --sloppy-imports packages/identity/scripts/compileMigration.ts
 */
import {getMigrations} from 'better-auth/db/migration';

import {createIdentityAuthOptions} from '../src/auth';
import {TURNSTILE_TEST_SECRET_PASS} from '../src/config';
import {createIdentityPool} from '../src/database';
import {createMemoryMailer} from '../src/mailer';

declare const Deno: {env: {get(name: string): string | undefined}};

// An empty scratch schema yields the full migration; point at an existing one for a delta.
const schema = Deno.env.get('IDENTITY_SCHEMA') ?? 'identity_compile';
const connectionString = Deno.env.get('DATABASE_URL');

if (!connectionString) {
    throw new Error('DATABASE_URL is required to compile the identity migration');
}

const pool = createIdentityPool({connectionString, schema});

await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

const options = createIdentityAuthOptions({
    config: {
        baseURL: 'https://auth.api.stagistic.local',
        secret: 'migration-only-secret-0123456789abcdef',
        appOrigins: ['https://editor.stagistic.local'],
        cookieDomain: 'stagistic.local',
        turnstileSecretKey: TURNSTILE_TEST_SECRET_PASS,
        jwtAudience: 'https://sync.api.stagistic.local',
    },
    database: pool,
    mailer: createMemoryMailer(),
});
const {compileMigrations} = await getMigrations(options);

console.log(await compileMigrations());
await pool.end();

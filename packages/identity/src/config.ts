/*
 * Identity service configuration. Origins are full origins
 * (`https://editor.stagistic.app`); the cookie domain and passkey rpID are the
 * shared parent domain (`stagistic.app`, locally `stagistic.local`).
 */

/** Cloudflare's official always-pass Turnstile secret (local dev and tests). */
export const TURNSTILE_TEST_SECRET_PASS = '1x0000000000000000000000000000000AA';
/** Cloudflare's official always-fail Turnstile secret. */
export const TURNSTILE_TEST_SECRET_FAIL = '2x0000000000000000000000000000000AA';

export interface IdentityConfig {
    /** Public origin of the auth service, e.g. `https://auth.api.stagistic.app`. */
    baseURL: string,
    /** Signs cookies and encrypts JWKS private keys; at least 32 random characters. */
    secret: string,
    /** Origins of user-facing apps; the first one receives magic links by default. */
    appOrigins: string[],
    /** Parent domain shared by apps and services (cookie domain + passkey rpID). */
    cookieDomain: string,
    turnstileSecretKey: string,
    /** Tests point this at a local stub instead of Cloudflare. */
    turnstileVerifyURL?: string,
    /** Accepted `aud` of access tokens (the collab service). */
    jwtAudience: string,
    sessionDays?: number,
}

const required = (env: Record<string, string | undefined>, name: string) => {
    const value = env[name];

    if (!value) {
        throw new Error(`[identity] missing ${name}`);
    }

    return value;
};

const list = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

/** Reads `IdentityConfig` from environment variables (see `apps/server/README.md`). */
export const readIdentityConfig = (env: Record<string, string | undefined>): IdentityConfig => ({
    baseURL: required(env, 'AUTH_BASE_URL'),
    secret: required(env, 'AUTH_SECRET'),
    appOrigins: list(required(env, 'APP_ORIGINS')),
    cookieDomain: required(env, 'COOKIE_DOMAIN'),
    turnstileSecretKey: required(env, 'TURNSTILE_SECRET_KEY'),
    turnstileVerifyURL: env.TURNSTILE_VERIFY_URL || undefined,
    jwtAudience: required(env, 'JWT_AUDIENCE'),
});

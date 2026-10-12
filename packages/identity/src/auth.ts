import {passkey} from '@better-auth/passkey';
import {betterAuth, type BetterAuthOptions} from 'better-auth';
import {
    captcha,
    jwt,
    magicLink,
} from 'better-auth/plugins';
import type {Pool} from 'pg';

import type {IdentityConfig} from './config';
import {buildAppMagicLink, buildMagicLinkEmail} from './magicLinkEmail';
import type {Mailer} from './mailer';

const DAY_SECONDS = 24 * 60 * 60;

export const MAGIC_LINK_TTL_SECONDS = 10 * 60;
export const ACCESS_TOKEN_TTL = '15m';

interface CreateIdentityAuthArgs {
    config: IdentityConfig,
    database: Pool,
    mailer: Mailer,
}

/** Better Auth options; also used to compute schema migrations. */
export const createIdentityAuthOptions = ({
    config,
    database,
    mailer,
}: CreateIdentityAuthArgs): BetterAuthOptions => ({
    appName: 'Stagistic',
    baseURL: config.baseURL,
    secret: config.secret,
    database,
    trustedOrigins: config.appOrigins,
    session: {
        expiresIn: (config.sessionDays ?? 60) * DAY_SECONDS,
        // Sliding: a session used at least once a day never expires.
        updateAge: DAY_SECONDS,
        cookieCache: {enabled: true, maxAge: 5 * 60},
    },
    advanced: {
        useSecureCookies: true,
        // One session across editor.*, casting.* … and the *.api.* services.
        crossSubDomainCookies: {enabled: true, domain: config.cookieDomain},
        defaultCookieAttributes: {sameSite: 'lax'},
    },
    rateLimit: {
        enabled: true,
        // Stateless server: limits survive restarts and are shared by instances.
        storage: 'database',
        window: 60,
        max: 100,
        customRules: {
            '/sign-in/magic-link': {window: 60, max: 5},
            '/magic-link/verify': {window: 60, max: 20},
        },
    },
    plugins: [
        magicLink({
            expiresIn: MAGIC_LINK_TTL_SECONDS,
            // Only a hash in the DB: a leaked row cannot be used as a sign-in link.
            storeToken: 'hashed',
            sendMagicLink: async ({
                email,
                url,
                token,
            }) => {
                const link = buildAppMagicLink({
                    verifyUrl: url,
                    token,
                    appOrigins: config.appOrigins,
                });

                await mailer.send(buildMagicLinkEmail({to: email, link}));
            },
        }),
        passkey({
            rpID: config.cookieDomain,
            rpName: 'Stagistic',
            origin: config.appOrigins,
        }),
        captcha({
            provider: 'cloudflare-turnstile',
            secretKey: config.turnstileSecretKey,
            endpoints: ['/sign-in/magic-link'],
            siteVerifyURLOverride: config.turnstileVerifyURL,
        }),
        jwt({
            jwt: {
                issuer: config.baseURL,
                audience: config.jwtAudience,
                expirationTime: ACCESS_TOKEN_TTL,
                definePayload: ({user}) => ({email: user.email}),
            },
        }),
    ],
});

/** What the HTTP layer needs from Better Auth (keeps its plugin types internal). */
export interface IdentityAuth {
    handler(request: Request): Promise<Response>,
}

export const createIdentityAuth = (args: CreateIdentityAuthArgs): IdentityAuth => betterAuth(createIdentityAuthOptions(args));

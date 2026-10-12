import {Hono} from 'hono';
import {cors} from 'hono/cors';

import type {IdentityAuth} from './auth';
import type {IdentityConfig} from './config';

/**
 * HTTP surface of the auth service (`auth.api.*`): Better Auth under
 * `/api/auth/*` with credentialed CORS for the app origins.
 */
export const createIdentityApp = ({auth, config}: {auth: IdentityAuth, config: IdentityConfig}) => {
    const app = new Hono();

    app.use('/api/auth/*', cors({
        origin: origin => (config.appOrigins.includes(origin) ? origin : null),
        credentials: true,
        allowMethods: [
            'GET',
            'POST',
            'OPTIONS',
        ],
        allowHeaders: [
            'content-type',
            'authorization',
            'x-captcha-response',
        ],
        maxAge: 600,
    }));
    app.on(['GET', 'POST'], '/api/auth/*', context => auth.handler(context.req.raw));
    app.get('/health', context => context.json({ok: true}));

    return app;
};

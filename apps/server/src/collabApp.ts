import type {AccessTokenClaims} from '@stagistic/identity';
import {Hono} from 'hono';
import {cors} from 'hono/cors';

/*
 * Collab service (`sync.api.*`). Phase 3 only proves the token path: it trusts
 * the auth service's JWT via JWKS, with no call to the auth service and no
 * shared memory. Hocuspocus and the scripts REST API arrive in phase 4.
 */
export const createCollabApp = ({
    appOrigins,
    verifyAccessToken,
}: {
    appOrigins: string[],
    verifyAccessToken: (token: string) => Promise<AccessTokenClaims>,
}) => {
    const app = new Hono();

    app.use('*', cors({
        origin: origin => (appOrigins.includes(origin) ? origin : null),
        allowHeaders: ['authorization', 'content-type'],
        maxAge: 600,
    }));
    app.get('/health', context => context.json({ok: true}));
    app.get('/me', async context => {
        const token = (/^Bearer (.+)$/).exec(context.req.header('authorization') ?? '')?.[1];

        if (!token) {
            return context.json({error: 'missing_token'}, 401);
        }

        try {
            return context.json(await verifyAccessToken(token));
        } catch {
            return context.json({error: 'invalid_token'}, 401);
        }
    });

    return app;
};

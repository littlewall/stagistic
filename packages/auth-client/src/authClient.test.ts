import {WebAuthnError} from '@simplewebauthn/browser';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    AuthRequestError,
    createAuthClient,
    PasskeyCancelledError,
    type WebAuthnCeremonies,
} from './authClient';

const AUTH = 'https://auth.api.stagistic.local';

const urlOf = (input: RequestInfo | URL) => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);

const recordingFetch = (respond: (url: string, init: RequestInit) => Response) => {
    const calls: Array<{
        url: string,
        init: RequestInit,
        headers: Headers,
    }> = [];
    const fetchImpl: typeof fetch = (input, init = {}) => {
        calls.push({
            url: urlOf(input),
            init,
            headers: new Headers(init.headers),
        });

        return Promise.resolve(respond(urlOf(input), init));
    };

    return {calls, fetch: fetchImpl};
};

describe('auth client', () => {
    it('requests a magic link with the captcha token and the session cookie', async () => {
        const {calls, fetch} = recordingFetch(() => Response.json({status: true}));

        await createAuthClient({authUrl: AUTH, fetch}).requestMagicLink('a@example.com', {captchaToken: 't', callbackURL: 'https://editor.stagistic.local/auth/callback'});

        expect(calls[0].url).toBe(`${AUTH}/api/auth/sign-in/magic-link`);
        expect(calls[0].init.credentials).toBe('include');
        expect(calls[0].headers.get('x-captcha-response')).toBe('t');
        expect(JSON.parse(calls[0].init.body as string)).toEqual({email: 'a@example.com', callbackURL: 'https://editor.stagistic.local/auth/callback'});
    });

    it('verifies the link token into a session', async () => {
        const {calls, fetch} = recordingFetch(() => Response.json({token: 'x', user: {id: 'u1', email: 'a@example.com'}}));

        expect(await createAuthClient({authUrl: AUTH, fetch}).verifyMagicLink('to/ken')).toEqual({userId: 'u1', email: 'a@example.com'});
        expect(calls[0].url).toBe(`${AUTH}/api/auth/magic-link/verify?token=to%2Fken`);
    });

    it('maps failures to user-facing messages', async () => {
        const {fetch} = recordingFetch(() => new Response('', {status: 429}));

        await expect(createAuthClient({authUrl: AUTH, fetch}).requestMagicLink('a@example.com', {captchaToken: 't', callbackURL: '/'}))
            .rejects.toEqual(new AuthRequestError('Too many attempts. Try again in a minute.', 429));
    });

    it('reads no session as null', async () => {
        const {fetch} = recordingFetch(() => Response.json(null));

        expect(await createAuthClient({authUrl: AUTH, fetch}).getSession()).toBeNull();
    });
});

describe('auth client passkeys', () => {
    const credential = {
        id: 'cred',
        rawId: 'cred',
        type: 'public-key' as const,
        response: {
            clientDataJSON: 'c',
            authenticatorData: 'a',
            signature: 's',
        },
        clientExtensionResults: {},
    };
    const webauthn = (overrides: Partial<WebAuthnCeremonies> = {}): WebAuthnCeremonies => ({
        startAuthentication: () => Promise.resolve(credential),
        startRegistration: () => Promise.resolve({
            ...credential,
            response: {
                clientDataJSON: 'c',
                attestationObject: 'o',
                transports: [],
            },
        }),
        ...overrides,
    });

    it('signs in: options, the browser prompt, then verification without extension results', async () => {
        const {calls, fetch} = recordingFetch(url => (url.endsWith('/generate-authenticate-options')
            ? Response.json({challenge: 'ch', rpId: 'stagistic.local'})
            : Response.json({session: {}, user: {id: 'u1', email: 'a@example.com'}})));
        let options: unknown;
        const client = createAuthClient({
            authUrl: AUTH,
            fetch,
            webauthn: webauthn({startAuthentication: ({optionsJSON}) => {
                options = optionsJSON;

                return Promise.resolve(credential);
            }}),
        });

        expect(await client.signInWithPasskey()).toEqual({userId: 'u1', email: 'a@example.com'});
        expect(options).toEqual({challenge: 'ch', rpId: 'stagistic.local'});
        expect(calls.map(call => call.url.replace(`${AUTH}/api/auth`, ''))).toEqual(['/passkey/generate-authenticate-options', '/passkey/verify-authentication']);
        expect(JSON.parse(calls[1].init.body as string)).toEqual({response: {
            id: 'cred',
            rawId: 'cred',
            type: 'public-key',
            response: credential.response,
        }});
    });

    it('turns a closed prompt into a cancellation, not an error message', async () => {
        const {calls, fetch} = recordingFetch(() => Response.json({challenge: 'ch'}));
        const aborted = new WebAuthnError({
            message: 'aborted',
            code: 'ERROR_CEREMONY_ABORTED',
            cause: new Error('abort'),
        });
        const client = createAuthClient({
            authUrl: AUTH,
            fetch,
            webauthn: webauthn({startAuthentication: () => Promise.reject(aborted)}),
        });

        await expect(client.signInWithPasskey()).rejects.toBeInstanceOf(PasskeyCancelledError);
        expect(calls).toHaveLength(1);
    });

    it('asks for a recent sign-in before adding a passkey to an old session', async () => {
        const {fetch} = recordingFetch(() => Response.json({code: 'SESSION_NOT_FRESH', message: 'Session is not fresh'}, {status: 403}));

        await expect(createAuthClient({
            authUrl: AUTH,
            fetch,
            webauthn: webauthn(),
        }).addPasskey())
            .rejects.toEqual(new AuthRequestError('For your security, sign in again with an email link, then add the passkey.', 403));
    });

    it('lists and deletes passkeys', async () => {
        const {calls, fetch} = recordingFetch(url => (url.endsWith('/list-user-passkeys')
            ? Response.json([
                {
                    id: 'p1',
                    name: null,
                    createdAt: '2026-10-14T10:00:00.000Z',
                    backedUp: true,
                },
            ])
            : Response.json({status: true})));
        const client = createAuthClient({
            authUrl: AUTH,
            fetch,
            webauthn: webauthn(),
        });

        expect(await client.listPasskeys()).toEqual([
            {
                id: 'p1',
                name: null,
                createdAt: Date.parse('2026-10-14T10:00:00.000Z'),
                backedUp: true,
            },
        ]);
        await client.deletePasskey('p1');
        expect(JSON.parse(calls[1].init.body as string)).toEqual({id: 'p1'});
    });
});

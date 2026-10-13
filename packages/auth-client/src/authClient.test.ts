import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {AuthRequestError, createAuthClient} from './authClient';

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

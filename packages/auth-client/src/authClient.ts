/*
 * Browser client of the auth service (`auth.api.*`, Better Auth). Plain fetch
 * with the session cookie (`credentials: 'include'`); the access token for the
 * collab service is fetched by the sync engine itself, not here.
 */

export class AuthRequestError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

export interface AuthSession {
    userId: string,
    email: string,
}

export interface AuthClient {
    /** Emails a sign-in link that opens `callbackURL` (an app page) with `?token=`. */
    requestMagicLink(email: string, options: {captchaToken: string, callbackURL: string}): Promise<void>,
    /** Exchanges the link's token for the session cookie. */
    verifyMagicLink(token: string): Promise<AuthSession>,
    getSession(): Promise<AuthSession | null>,
    signOut(): Promise<void>,
}

const MESSAGES: Record<number, string> = {
    400: 'Enter a valid email address.',
    403: 'The human check failed. Please try again.',
    429: 'Too many attempts. Try again in a minute.',
};

export const createAuthClient = ({authUrl, fetch: fetchImpl = (...args) => fetch(...args)}: {authUrl: string, fetch?: typeof fetch}): AuthClient => {
    const call = async (path: string, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);

        if (init.body) {
            headers.set('content-type', 'application/json');
        }

        const response = await fetchImpl(`${authUrl}/api/auth${path}`, {
            ...init,
            credentials: 'include',
            headers,
        });

        if (!response.ok) {
            throw new AuthRequestError(MESSAGES[response.status] ?? 'Something went wrong. Please try again.', response.status);
        }

        return response;
    };
    const toSession = (body: {user?: {id?: unknown, email?: unknown}} | null): AuthSession | null => (
        body?.user && typeof body.user.id === 'string' && typeof body.user.email === 'string'
            ? {userId: body.user.id, email: body.user.email}
            : null
    );

    return {
        requestMagicLink: async (email, {captchaToken, callbackURL}) => {
            await call('/sign-in/magic-link', {
                method: 'POST',
                headers: {'x-captcha-response': captchaToken},
                body: JSON.stringify({email, callbackURL}),
            });
        },
        verifyMagicLink: async token => {
            const session = toSession(await (await call(`/magic-link/verify?token=${encodeURIComponent(token)}`)).json() as Parameters<typeof toSession>[0]);

            if (!session) {
                throw new AuthRequestError('This sign-in link is invalid or expired.', 401);
            }

            return session;
        },
        getSession: async () => toSession(await (await call('/get-session')).json() as Parameters<typeof toSession>[0]),
        signOut: async () => {
            await call('/sign-out', {method: 'POST', body: '{}'});
        },
    };
};

import {
    browserSupportsWebAuthn,
    startAuthentication,
    startRegistration,
    WebAuthnError,
} from '@simplewebauthn/browser';

/*
 * Browser client of the auth service (`auth.api.*`, Better Auth). Plain fetch
 * with the session cookie (`credentials: 'include'`); the access token for the
 * collab service is fetched by the sync engine itself, not here. Passkeys use
 * the browser's WebAuthn API (`@simplewebauthn/browser`).
 */

export class AuthRequestError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'AuthRequestError';
    }
}

export interface AuthSession {
    userId: string,
    email: string,
}

/** False in browsers (and webviews) without WebAuthn: hide passkey actions. */
export const browserSupportsPasskeys = () => browserSupportsWebAuthn();

/** The user closed or declined the passkey prompt: not an error to show. */
export class PasskeyCancelledError extends Error {
    constructor() {
        super('Passkey prompt was cancelled.');
        this.name = 'PasskeyCancelledError';
    }
}

export interface PasskeySummary {
    id: string,
    name: string | null,
    createdAt: number,
    /** Synced across the user's devices (iCloud Keychain, Google Password Manager …). */
    backedUp: boolean,
}

export interface AuthClient {
    /** Emails a sign-in link that opens `callbackURL` (an app page) with `?token=`. */
    requestMagicLink(email: string, options: {captchaToken: string, callbackURL: string}): Promise<void>,
    /** Exchanges the link's token for the session cookie. */
    verifyMagicLink(token: string): Promise<AuthSession>,
    getSession(): Promise<AuthSession | null>,
    signOut(): Promise<void>,
    /** Sign in with a passkey stored for this site (no email needed). */
    signInWithPasskey(): Promise<AuthSession>,
    /** Adds a passkey to the signed-in account (needs a sign-in from the last 24 hours). */
    addPasskey(): Promise<void>,
    listPasskeys(): Promise<PasskeySummary[]>,
    deletePasskey(id: string): Promise<void>,
}

/** WebAuthn ceremonies; injectable for tests. */
export interface WebAuthnCeremonies {
    startRegistration: typeof startRegistration,
    startAuthentication: typeof startAuthentication,
}

const MESSAGES: Record<number, string> = {
    400: 'Enter a valid email address.',
    403: 'The human check failed. Please try again.',
    429: 'Too many attempts. Try again in a minute.',
};

/** Better Auth error codes that need their own message. */
const CODE_MESSAGES: Record<string, string> = {
    SESSION_NOT_FRESH: 'For your security, sign in again with an email link, then add the passkey.',
    PASSKEY_NOT_FOUND: 'This passkey is not linked to an account. Sign in with an email link.',
    CHALLENGE_NOT_FOUND: 'The passkey prompt expired. Please try again.',
    AUTHENTICATION_FAILED: 'The passkey could not be verified. Please try again.',
    FAILED_TO_VERIFY_REGISTRATION: 'The passkey could not be added. Please try again.',
};

const readErrorCode = async (response: Response) => {
    const body = await response.json().catch(() => null) as {code?: unknown} | null;

    return typeof body?.code === 'string' ? body.code : null;
};

/** Runs a WebAuthn ceremony; a closed or declined prompt becomes `PasskeyCancelledError`. */
const ceremony = async <T>(run: () => Promise<T>): Promise<T> => {
    try {
        return await run();
    } catch (error) {
        if (error instanceof WebAuthnError && error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
            throw new AuthRequestError('This passkey is already added to your account.', 400);
        }

        if ((error instanceof WebAuthnError && error.code === 'ERROR_CEREMONY_ABORTED')
            || (error instanceof Error && error.name === 'NotAllowedError')
            || (error instanceof WebAuthnError && error.cause instanceof Error && error.cause.name === 'NotAllowedError')) {
            throw new PasskeyCancelledError();
        }

        throw new AuthRequestError('This browser could not use a passkey.', 400);
    }
};

export const createAuthClient = ({
    authUrl,
    fetch: fetchImpl = (...args) => fetch(...args),
    webauthn = {startRegistration, startAuthentication},
}: {
    authUrl: string,
    fetch?: typeof fetch,
    webauthn?: WebAuthnCeremonies,
}): AuthClient => {
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
            const code = await readErrorCode(response);

            throw new AuthRequestError(
                (code && CODE_MESSAGES[code]) ?? MESSAGES[response.status] ?? 'Something went wrong. Please try again.',
                response.status,
            );
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
        signInWithPasskey: async () => {
            const optionsJSON = await (await call('/passkey/generate-authenticate-options')).json() as Parameters<WebAuthnCeremonies['startAuthentication']>[0]['optionsJSON'];
            const {clientExtensionResults: _extensions, ...response} = await ceremony(() => webauthn.startAuthentication({optionsJSON}));
            const session = toSession(await (await call('/passkey/verify-authentication', {
                method: 'POST',
                body: JSON.stringify({response}),
            })).json() as Parameters<typeof toSession>[0]);

            if (!session) {
                throw new AuthRequestError('The passkey could not be verified. Please try again.', 401);
            }

            return session;
        },
        addPasskey: async () => {
            const optionsJSON = await (await call('/passkey/generate-register-options')).json() as Parameters<WebAuthnCeremonies['startRegistration']>[0]['optionsJSON'];
            const {clientExtensionResults: _extensions, ...response} = await ceremony(() => webauthn.startRegistration({optionsJSON}));

            await call('/passkey/verify-registration', {method: 'POST', body: JSON.stringify({response})});
        },
        listPasskeys: async () => {
            const rows = await (await call('/passkey/list-user-passkeys')).json() as Array<{
                id: string,
                name?: string | null,
                createdAt: string,
                backedUp?: boolean,
            }>;

            return rows.map(row => ({
                id: row.id,
                name: row.name ?? null,
                createdAt: Date.parse(row.createdAt),
                backedUp: row.backedUp === true,
            }));
        },
        deletePasskey: async id => {
            await call('/passkey/delete-passkey', {method: 'POST', body: JSON.stringify({id})});
        },
    };
};

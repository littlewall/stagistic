/*
 * Access tokens for the collab service, fetched by the engine itself: the auth
 * service's session cookie rides along (`credentials: 'include'`), the JWT
 * stays in memory and is renewed shortly before it expires.
 */

export interface AccessTokenClaims {
    accountId: string,
    email: string,
    expiresAt: number,
}

export interface AccessTokenSource {
    /** A valid token, or null when signed out. `force` skips the cache (after a 401). */
    get(options?: {force?: boolean}): Promise<string | null>,
    claims(): AccessTokenClaims | null,
    clear(): void,
}

const RENEW_BEFORE_MS = 60_000;

const decodeClaims = (token: string): AccessTokenClaims | null => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
            sub?: unknown,
            email?: unknown,
            exp?: unknown,
        };

        return typeof payload.sub === 'string' && typeof payload.exp === 'number'
            ? {
                accountId: payload.sub,
                email: typeof payload.email === 'string' ? payload.email : '',
                expiresAt: payload.exp * 1000,
            }
            : null;
    } catch {
        return null;
    }
};

export const createAccessTokenSource = ({authUrl, fetch: fetchImpl = fetch}: {authUrl: string, fetch?: typeof fetch}): AccessTokenSource => {
    let token: string | null = null;
    let claims: AccessTokenClaims | null = null;
    let inflight: Promise<string | null> | null = null;

    const load = async () => {
        const response = await fetchImpl(`${authUrl}/api/auth/token`, {credentials: 'include'});

        if (response.status === 401 || response.status === 403) {
            token = null;
            claims = null;

            return null;
        }

        if (!response.ok) {
            throw new Error(`[sync-engine] access token request failed (${response.status})`);
        }

        const body = await response.json() as {token?: string};

        token = body.token ?? null;
        claims = token ? decodeClaims(token) : null;

        return claims ? token : null;
    };

    return {
        get: ({force = false} = {}) => {
            if (!force && token && claims && claims.expiresAt - Date.now() > RENEW_BEFORE_MS) {
                return Promise.resolve(token);
            }

            inflight ??= load().finally(() => {
                inflight = null;
            });

            return inflight;
        },
        claims: () => claims,
        clear: () => {
            token = null;
            claims = null;
        },
    };
};

// filepath: /Users/milanzitka/git/stagistic/app/lib/auth/session.server.ts
import jwt from 'jsonwebtoken';
import {
    createAccessToken,
    createRefreshToken,
    createRefreshTokenCookie,
    TokenPayload,
    REFRESH_TOKEN_COOKIE,
} from './jwt.server';
import globals from '~config/globals';
import {resolveEntityManager} from '~lib/db/orm';
import {User} from '~lib/db/entities/User';

// Constants
const REFRESH_TOKEN_SECRET = globals.get('auth.jwt.refreshTokenSecret');

interface UserSession {
    user: User | null,
    // Access token is optional as it's primarily used for API calls, not for rendering
    accessToken?: string | null,
}

/**
 * Gets the user session from the request
 * It validates the refresh token from the cookie and creates a session
 * The access token is used for authentication but not necessarily returned
 */
export async function getUserSession(request: Request): Promise<UserSession | null> {
    try {
        const cookie = request.headers.get('Cookie');

        if (!cookie) {
            return null;
        }

        // Parse cookies to get refresh token
        const cookieObj = Object.fromEntries(
            cookie.split('; ').map((c: string) => {
                const [key, ...value] = c.split('=');

                return [key, value.join('=')];
            }),
        );

        // Check for refresh token
        const refreshToken = cookieObj[REFRESH_TOKEN_COOKIE];

        if (!refreshToken) {
            return null;
        }

        try {
            // Verify refresh token
            const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;

            // Create a new access token using the payload from the refresh token
            const accessToken = createAccessToken(payload);

            // Fetch user from database to ensure they still exist
            const em = await resolveEntityManager();
            const user = await em.getRepository(User).findOne({id: payload.id});

            if (!user) {
                return null;
            }

            return {
                user,
                accessToken,
            };
        } catch (tokenError) {
            // If refresh token is invalid or expired, return null
            console.error('Token validation error:', tokenError instanceof Error ? tokenError.message : 'Unknown token error');

            return null;
        }
    } catch (error) {
        console.error('Error in getUserSession:', error instanceof Error ? error.message : 'Unknown error');

        // Token is invalid or expired
        return null;
    }
}

/**
 * Creates a user session by generating access and refresh tokens
 * Only the refresh token is stored in a cookie, access token is returned
 */
export function createUserSession(
    user: {id: string, email: string},
    response: Response = new Response(),
): {response: Response, accessToken: string} {
    const payload: TokenPayload = {
        id: user.id,
        email: user.email,
    };

    // Create tokens
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    // Create headers object
    const headers = new Headers(response.headers);

    // Set refresh token as a cookie
    const refreshCookie = createRefreshTokenCookie(refreshToken);

    headers.append('Set-Cookie', refreshCookie.toString());

    // Return updated response and access token
    return {
        response: new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        }),
        accessToken,
    };
}

/**
 * Removes the user session by clearing the refresh token cookie
 */
export function removeUserSession(
    response: Response = new Response(),
): Response {
    const headers = new Headers(response.headers);

    // Clear refresh token cookie
    headers.append(
        'Set-Cookie',
        `${REFRESH_TOKEN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`,
    );

    // Return updated response
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/**
 * Validates a refresh token and issues a new access token if valid
 */
export async function refreshUserSession(request: Request): Promise<{accessToken: string} | null> {
    const cookie = request.headers.get('Cookie');

    if (!cookie) return null;

    // Parse cookies to get refresh token
    const cookieObj = Object.fromEntries(
        cookie.split('; ').map((c: string) => {
            const [key, ...value] = c.split('=');

            return [key, value.join('=')];
        }),
    );

    const refreshToken = cookieObj[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) return null;

    try {
        // Verify refresh token
        const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;

        // Fetch user from database to ensure they still exist
        const em = await resolveEntityManager();
        const user = await em.getRepository(User).findOne({id: payload.id});

        if (!user) return null;

        // Create a new access token
        const accessToken = createAccessToken(payload);

        return {accessToken};
    } catch (error) {
        // Token is invalid or expired
        return null;
    }
}

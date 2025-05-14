// filepath: /Users/milanzitka/git/stagistic/app/lib/auth/session.server.ts
import jwt from 'jsonwebtoken';
import {
    createAccessToken,
    createRefreshToken,
    createRefreshTokenCookie,
    TokenPayload,
} from './jwt.server';
import globals from '~config/globals';
import {resolveEntityManager} from '~lib/db/orm';
import {User} from '~lib/db/entities/User';
import {clearRefreshTokenCookie} from './client';
import {REFRESH_TOKEN_COOKIE_NAME} from './jwt';
import {Cookie} from '@mjackson/headers';

const REFRESH_TOKEN_SECRET = globals.get('auth.jwt.refreshTokenSecret');

interface UserSession {
    user: User | null,
    accessToken?: string | null,
}

export const getUserSession = async (request: Request): Promise<UserSession | null> => {
    try {
        const cookies = new Cookie(request.headers.get('Cookie') ?? '');

        const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE_NAME);

        if (!refreshToken) {
            return null;
        }

        try {
            const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;

            const accessToken = createAccessToken(payload);

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
            console.error('Token validation error:', tokenError instanceof Error ? tokenError.message : 'Unknown token error');

            return null;
        }
    } catch (error) {
        console.error('Error in getUserSession:', error instanceof Error ? error.message : 'Unknown error');

        return null;
    }
};

export const createUserSession = (
    user: {id: string, email: string},
    response: Response = new Response(),
): {response: Response, accessToken: string} => {
    const payload: TokenPayload = {
        id: user.id,
        email: user.email,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    const headers = new Headers(response.headers);

    const refreshCookie = createRefreshTokenCookie(refreshToken);

    headers.append('Set-Cookie', refreshCookie.toString());

    return {
        response: new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        }),
        accessToken,
    };
};

export const removeUserSession = (
    response: Response = new Response(),
): Response => {
    const headers = new Headers(response.headers);

    headers.append(
        'Set-Cookie',
        clearRefreshTokenCookie(),
    );

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
};

export const refreshUserSession = async (request: Request): Promise<{accessToken: string} | null> => {
    const cookies = new Cookie(request.headers.get('Cookie') ?? '');

    const refreshToken = cookies.get(REFRESH_TOKEN_COOKIE_NAME);

    if (!refreshToken) {
        return null;
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;

        const em = await resolveEntityManager();
        const user = await em.getRepository(User).findOne({id: payload.id});

        if (!user) {
            return null;
        }

        const accessToken = createAccessToken(payload);

        return {accessToken};
    } catch (error) {
        return null;
    }
};

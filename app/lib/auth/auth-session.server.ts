import jwt from 'jsonwebtoken';
import {
    createAccessToken,
    createRefreshToken,
    setRefreshTokenCookie,
    TokenPayload,
    refreshTokenSession,
} from './jwt.server';
import globals from '~config/globals';
import {resolveEntityManager} from '~lib/db/orm';
import {User} from '~lib/db/entities/User';
import {REFRESH_TOKEN_COOKIE_NAME} from './jwt';
import {createCookieSessionStorage, Session} from '@remix-run/node';
import {COOKIE_MAGIC_LINK_SENT} from './configs';
import config from '~config/globals';

const REFRESH_TOKEN_SECRET = globals.get('auth.jwt.refreshTokenSecret');

interface UserSession {
    user: User | null,
    accessToken?: string | null,
}

export const getUserSession = async (request: Request): Promise<UserSession | null> => {
    try {
        const session = await refreshTokenSession.getSession(request.headers.get('Cookie'));
        const refreshToken = session.get(REFRESH_TOKEN_COOKIE_NAME) as unknown;

        if (typeof refreshToken !== 'string' || !refreshToken) {
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

export const createUserSession = async (
    user: {id: string, email: string},
    response: Response = new Response(),
): Promise<{response: Response, accessToken: string}> => {
    const payload: TokenPayload = {
        id: user.id,
        email: user.email,
    };

    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);

    const headers = new Headers(response.headers);

    const refreshCookie = await setRefreshTokenCookie(refreshToken);

    headers.append('Set-Cookie', refreshCookie);

    return {
        response: new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        }),
        accessToken,
    };
};

export const removeUserSession = async (
    request: Request,
    response: Response = new Response(),
): Promise<Response> => {
    const headers = new Headers(response.headers);
    const session = await refreshTokenSession.getSession(request.headers.get('Cookie'));

    const destroyCookie = await refreshTokenSession.destroySession(session);

    headers.append('Set-Cookie', destroyCookie);

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
};

export const refreshUserSession = async (request: Request): Promise<{accessToken: string} | null> => {
    const session = await refreshTokenSession.getSession(request.headers.get('Cookie'));
    const refreshToken = session.get(REFRESH_TOKEN_COOKIE_NAME) as unknown;

    if (typeof refreshToken !== 'string' || !refreshToken) {
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

export const isFormDataRequest = (request: Request): boolean => {
    const contentType = request.headers.get('Content-Type') ?? '';

    return (
        contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')
    );
};

export const authenticate = async (request: Request, returnTo?: string) => {
    const userSession = await getUserSession(request);
    const redirectUrl = returnTo || '/auth/login';
    let response = undefined;

    if (!userSession) {
        response = new Response(null, {
            status: 302,
            headers: {
                Location: redirectUrl,
            },
        });
    }

    return {
        user: userSession,
        response,
    };
};

const magicLinkCookieSession = createCookieSessionStorage({
    cookie: {
        name: COOKIE_MAGIC_LINK_SENT,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 5,
        secrets: [config.get('auth.magicLink.secret')],
        secure: process.env.NODE_ENV === 'production',
    },
});

export const getMagicLinkSession = magicLinkCookieSession.getSession;

export const createMagicLinkCookie = (session: Session) => {
    return magicLinkCookieSession.commitSession(session);
};

export const deleteMagicLinkCookie = (session: Session) => {
    return magicLinkCookieSession.destroySession(session);
};

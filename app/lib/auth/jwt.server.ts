import jwt from 'jsonwebtoken';
import globals from '~config/globals';
import {REFRESH_TOKEN_COOKIE_NAME} from './jwt';
import {createCookieSessionStorage} from '@remix-run/node';
import {JWT_ERRORS, JwtErrorCode} from './configs';

export type TokenPayload = {
    id: string,
    email: string,
    exp?: number,
    iat?: number,
};

export type TokenResponse = {
    accessToken: string,
    headers: Headers,
};

const ACCESS_TOKEN_EXPIRY = 60 * 60 * 2;
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7;

const ACCESS_TOKEN_SECRET = globals.get('auth.jwt.accessTokenSecret');
const REFRESH_TOKEN_SECRET = globals.get('auth.jwt.refreshTokenSecret');

export const createAccessToken = (payload: TokenPayload): string => {
    const accessTokenExpiry = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY;

    return jwt.sign(
        {...payload, exp: accessTokenExpiry},
        ACCESS_TOKEN_SECRET,
    );
};

export const createRefreshToken = (payload: TokenPayload): string => {
    const refreshTokenExpiry = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY;

    return jwt.sign(
        {...payload, exp: refreshTokenExpiry},
        REFRESH_TOKEN_SECRET,
    );
};

export const refreshTokenSession = createCookieSessionStorage({
    cookie: {
        name: REFRESH_TOKEN_COOKIE_NAME,
        httpOnly: true,
        maxAge: REFRESH_TOKEN_EXPIRY,
        path: '/',
        sameSite: 'lax',
        secure: true,
        secrets: [REFRESH_TOKEN_SECRET],
    },
});

export const setRefreshTokenCookie = async (refreshToken: string) => {
    const session = await refreshTokenSession.getSession();

    session.set(REFRESH_TOKEN_COOKIE_NAME, refreshToken);

    return refreshTokenSession.commitSession(session);
};

export const destroyRefreshTokenCookie = async (request: Request) => {
    const session = await refreshTokenSession.getSession(request.headers.get('Cookie'));

    return refreshTokenSession.destroySession(session);
};

export const createTokens = async (payload: TokenPayload): Promise<TokenResponse> => {
    const accessToken = createAccessToken(payload);
    const refreshToken = createRefreshToken(payload);
    const cookie = await setRefreshTokenCookie(refreshToken);

    const headers = new Headers();

    headers.append('Set-Cookie', cookie);

    return {
        accessToken,
        headers,
    };
};

export const verifyAccessToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new Error(JWT_ERRORS[JwtErrorCode.TOKEN_EXPIRED].message);
        }

        throw new TypeError(JWT_ERRORS[JwtErrorCode.INVALID_TOKEN].message);
    }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new Error(JWT_ERRORS[JwtErrorCode.TOKEN_EXPIRED].message);
        }

        throw new TypeError(JWT_ERRORS[JwtErrorCode.INVALID_TOKEN].message);
    }
};

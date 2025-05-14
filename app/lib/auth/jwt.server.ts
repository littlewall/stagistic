import jwt from 'jsonwebtoken';
import {SetCookie} from '@mjackson/headers';
import globals from '~config/globals';
import {REFRESH_TOKEN_COOKIE_NAME} from './jwt';

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

export type AccessTokenResponse = {
    accessToken: string,
};

export type RefreshTokenResponse = {
    refreshToken: string,
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

export const createRefreshTokenCookie = (refreshToken: string): SetCookie => {
    return new SetCookie({
        name: REFRESH_TOKEN_COOKIE_NAME,
        httpOnly: true,
        value: refreshToken,
        maxAge: REFRESH_TOKEN_EXPIRY,
        path: '/',
        sameSite: 'Lax',
        secure: true,
    });
};

export const createAccessTokenOnly = (payload: TokenPayload): AccessTokenResponse => {
    const accessToken = createAccessToken(payload);

    return {
        accessToken,
    };
};

export const createRefreshTokenOnly = (payload: TokenPayload): RefreshTokenResponse => {
    const refreshToken = createRefreshToken(payload);

    const headers = new Headers();
    const refreshCookie = createRefreshTokenCookie(refreshToken);

    headers.append('Set-Cookie', refreshCookie.toString());

    return {
        refreshToken,
        headers,
    };
};

export const createTokens = (payload: TokenPayload): TokenResponse => {
    const {accessToken} = createAccessTokenOnly(payload);

    const {headers} = createRefreshTokenOnly(payload);

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
            throw new Error('Token expired. Please request a new one.');
        }

        throw new TypeError('Invalid Token');
    }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired. Please request a new one.');
        }

        throw new TypeError('Invalid Token');
    }
};

export const getRefreshTokenFromRequest = (request: Request): string | null => {
    const cookieHeader = request.headers.get('Cookie');

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const refreshCookie = cookies.find(cookie => cookie.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));

    if (!refreshCookie) {
        return null;
    }

    return refreshCookie.split('=')[1];
};

import jwt from 'jsonwebtoken';
import {SetCookie} from '@mjackson/headers';
import globals from '~config/globals';

// Token types and payloads
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

// Constants for token configuration
const ACCESS_TOKEN_EXPIRY = 60 * 60 * 2; // 2 hours in seconds
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Get JWT secrets from globals
const ACCESS_TOKEN_SECRET = globals.get('auth.jwt.accessTokenSecret');
const REFRESH_TOKEN_SECRET = globals.get('auth.jwt.refreshTokenSecret');

/**
 * Creates an access token
 */
export function createAccessToken(payload: TokenPayload): string {
    const accessTokenExpiry = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY;

    return jwt.sign(
        {...payload, exp: accessTokenExpiry},
        ACCESS_TOKEN_SECRET,
    );
}

/**
 * Creates a refresh token
 */
export function createRefreshToken(payload: TokenPayload): string {
    const refreshTokenExpiry = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY;

    return jwt.sign(
        {...payload, exp: refreshTokenExpiry},
        REFRESH_TOKEN_SECRET,
    );
}

/**
 * Creates a cookie with the refresh token
 */
export function createRefreshTokenCookie(refreshToken: string): SetCookie {
    return new SetCookie({
        name: REFRESH_TOKEN_COOKIE,
        httpOnly: true,
        value: refreshToken,
        maxAge: REFRESH_TOKEN_EXPIRY,
        path: '/',
        sameSite: 'Lax',
        secure: true,
    });
}

/**
 * Creates just an access token without cookies
 */
export function createAccessTokenOnly(payload: TokenPayload): AccessTokenResponse {
    const accessToken = createAccessToken(payload);

    return {
        accessToken,
    };
}

/**
 * Creates just a refresh token with cookies in headers
 */
export function createRefreshTokenOnly(payload: TokenPayload): RefreshTokenResponse {
    const refreshToken = createRefreshToken(payload);

    const headers = new Headers();
    const refreshCookie = createRefreshTokenCookie(refreshToken);

    headers.append('Set-Cookie', refreshCookie.toString());

    return {
        refreshToken,
        headers,
    };
}

/**
 * Creates both access and refresh tokens and configures response headers with refresh token cookie
 */
export function createTokens(payload: TokenPayload): TokenResponse {
    // Create access token
    const {accessToken} = createAccessTokenOnly(payload);

    // Create refresh token with headers
    const {headers} = createRefreshTokenOnly(payload);

    return {
        accessToken,
        headers,
    };
}

/**
 * Verifies a JWT access token and returns the payload if valid
 */
export function verifyAccessToken(token: string): TokenPayload {
    try {
        return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired. Please request a new one.');
        }

        throw new TypeError('Invalid Token');
    }
}

/**
 * Verifies a JWT refresh token and returns the payload if valid
 */
export function verifyRefreshToken(token: string): TokenPayload {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired. Please request a new one.');
        }

        throw new TypeError('Invalid Token');
    }
}

/**
 * Extracts the refresh token from request cookies
 */
export function getRefreshTokenFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get('Cookie');

    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    const refreshCookie = cookies.find(cookie => cookie.startsWith(`${REFRESH_TOKEN_COOKIE}=`));

    if (!refreshCookie) return null;

    return refreshCookie.split('=')[1];
}

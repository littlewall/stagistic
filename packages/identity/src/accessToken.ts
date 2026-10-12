import {
    createLocalJWKSet,
    createRemoteJWKSet,
    type JSONWebKeySet,
    jwtVerify,
} from 'jose';

/*
 * Access-token check for services (collab): verifies the auth service's JWT
 * against its JWKS, without calling the auth service per request.
 */

export interface AccessTokenClaims {
    userId: string,
    email: string | null,
}

export interface AccessTokenVerifierOptions {
    issuer: string,
    audience: string,
    /** `https://auth.api…/api/auth/jwks`; fetched and cached by jose. */
    jwksUrl?: string,
    /** A key set at hand (tests). */
    jwks?: JSONWebKeySet,
}

export const createAccessTokenVerifier = ({
    issuer,
    audience,
    jwksUrl,
    jwks,
}: AccessTokenVerifierOptions) => {
    if (!jwks && !jwksUrl) {
        throw new Error('[identity] access token verifier needs jwksUrl or jwks');
    }

    const keys = jwks ? createLocalJWKSet(jwks) : createRemoteJWKSet(new URL(jwksUrl!));

    return async (token: string): Promise<AccessTokenClaims> => {
        const {payload} = await jwtVerify(token, keys, {issuer, audience});

        if (typeof payload.sub !== 'string') {
            throw new Error('[identity] access token without subject');
        }

        return {userId: payload.sub, email: typeof payload.email === 'string' ? payload.email : null};
    };
};

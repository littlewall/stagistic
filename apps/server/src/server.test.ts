import {createAccessTokenVerifier} from '@stagistic/identity';
import {
    exportJWK,
    generateKeyPair,
    SignJWT,
} from 'jose';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createCollabApp} from './collabApp';
import {parseServerRoles} from './roles';

const ISSUER = 'https://auth.api.stagistic.local';
const AUDIENCE = 'https://sync.api.stagistic.local';
const EDITOR = 'https://editor.stagistic.local';

describe('server roles', () => {
    it('defaults to both roles and rejects unknown ones', () => {
        expect([...parseServerRoles(undefined)]).toEqual(['auth', 'collab']);
        expect([...parseServerRoles('collab')]).toEqual(['collab']);
        expect(() => parseServerRoles('auth,sync')).toThrow();
    });
});

describe('collab access tokens', () => {
    it('accepts the auth service JWT and rejects a missing or foreign one', async () => {
        const {privateKey, publicKey} = await generateKeyPair('EdDSA');
        const jwk = {
            ...await exportJWK(publicKey),
            kid: 'k1',
            alg: 'EdDSA',
        };
        const sign = (audience: string) => new SignJWT({email: 'hamlet@example.com'})
            .setProtectedHeader({alg: 'EdDSA', kid: 'k1'})
            .setIssuer(ISSUER)
            .setAudience(audience)
            .setSubject('user-1')
            .setExpirationTime('5m')
            .sign(privateKey);
        const app = createCollabApp({
            appOrigins: [EDITOR],
            verifyAccessToken: createAccessTokenVerifier({
                issuer: ISSUER,
                audience: AUDIENCE,
                jwks: {keys: [jwk]},
            }),
        });
        const me = (token?: string) => app.request('/me', {headers: token ? {authorization: `Bearer ${token}`} : {}});

        expect(await (await me(await sign(AUDIENCE))).json()).toEqual({userId: 'user-1', email: 'hamlet@example.com'});
        expect((await me()).status).toBe(401);
        expect((await me(await sign('https://other.api'))).status).toBe(401);
    });
});

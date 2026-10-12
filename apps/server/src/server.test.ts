import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {parseServerRoles} from './roles';

describe('server roles', () => {
    it('defaults to both roles and rejects unknown ones', () => {
        expect([...parseServerRoles(undefined)]).toEqual(['auth', 'collab']);
        expect([...parseServerRoles('collab')]).toEqual(['collab']);
        expect(() => parseServerRoles('auth,sync')).toThrow();
    });
});

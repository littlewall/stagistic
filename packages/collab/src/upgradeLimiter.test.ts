import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {clientIpOf, createUpgradeLimiter} from './upgradeLimiter';

describe('collab socket limit', () => {
    it('limits sockets per IP within the window, independently per IP', () => {
        const limiter = createUpgradeLimiter({max: 2, windowMs: 1_000});

        expect([
            limiter.allow('a', 0),
            limiter.allow('a', 10),
            limiter.allow('a', 20),
        ]).toEqual([
            true,
            true,
            false,
        ]);
        expect(limiter.allow('b', 20)).toBe(true);
        expect(limiter.allow('a', 1_500)).toBe(true);
    });

    it('takes the client IP from the proxy header', () => {
        expect(clientIpOf(new Headers({'x-forwarded-for': '203.0.113.7, 10.0.0.1'}))).toBe('203.0.113.7');
        expect(clientIpOf(new Headers())).toBe('unknown');
    });
});

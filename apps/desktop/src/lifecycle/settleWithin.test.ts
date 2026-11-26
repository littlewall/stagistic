import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import type {SettleResult} from './desktopController';
import {settleWithin} from './settleWithin';

afterEach(() => {
    vi.useRealTimers();
});

describe('settleWithin', () => {
    it('passes the result through when settling finishes in time', async () => {
        expect(await settleWithin(() => Promise.resolve<SettleResult>('saved'), 100)).toBe('saved');
    });

    it('fails when settling does not finish within the bound', async () => {
        vi.useFakeTimers();

        const pending = settleWithin(() => new Promise<SettleResult>(() => {}), 100);

        await vi.advanceTimersByTimeAsync(100);
        expect(await pending).toBe('failed');
    });
});

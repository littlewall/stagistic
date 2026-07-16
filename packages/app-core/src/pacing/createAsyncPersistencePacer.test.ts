import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createAsyncPersistencePacer} from './createAsyncPersistencePacer';

describe('async persistence pacer', () => {
    it('coalesces pending values and flushes the newest one', async () => {
        const persisted: string[] = [];
        const pacer = createAsyncPersistencePacer((value: string) => {
            persisted.push(value);

            return Promise.resolve();
        }, {
            key: 'draft:test',
            waitMs: 10_000,
        });

        void pacer.schedule('first');
        void pacer.schedule('newest');

        expect(pacer.getSnapshot().isPending).toBe(true);

        await pacer.flush();

        expect(persisted).toEqual(['newest']);
        expect(pacer.getSnapshot()).toMatchObject({
            status: 'settled',
            isPending: false,
            isExecuting: false,
            successCount: 1,
            lastError: null,
        });
        pacer.dispose();
    });

    it('does not retry local persistence failures by default', async () => {
        const persist = vi.fn().mockRejectedValue(new Error('disk full'));
        const pacer = createAsyncPersistencePacer(persist, {
            key: 'draft:local-error',
            waitMs: 10_000,
        });

        void pacer.schedule('value');

        await expect(pacer.flush()).rejects.toThrow('disk full');
        expect(persist).toHaveBeenCalledTimes(1);
        expect(pacer.getSnapshot().lastError?.message).toBe('disk full');
        pacer.dispose();
    });

    it('retries operations explicitly classified as transient', async () => {
        const persist = vi.fn()
            .mockRejectedValueOnce(new Error('offline'))
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce(undefined);
        const pacer = createAsyncPersistencePacer(persist, {
            key: 'sync:transient',
            waitMs: 10_000,
            retryProfile: 'transient',
        });

        void pacer.schedule('value');
        await pacer.flush();

        expect(persist).toHaveBeenCalledTimes(3);
        expect(pacer.getSnapshot().lastError).toBeNull();
        pacer.dispose();
    });
});

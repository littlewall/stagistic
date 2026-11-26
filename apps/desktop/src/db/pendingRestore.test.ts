import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {applyPendingRestore, type PendingRestorePorts} from './pendingRestore';

const setup = (overrides: Partial<PendingRestorePorts> = {}) => {
    const calls: string[] = [];
    const ports: PendingRestorePorts = {
        readStaged: () => Promise.resolve(new Blob(['x'])),
        clearStaged: () => {
            calls.push('clear');

            return Promise.resolve();
        },
        validate: () => {
            calls.push('validate');

            return Promise.resolve();
        },
        replace: () => {
            calls.push('replace');

            return Promise.resolve();
        },
        reportError: () => {
            calls.push('report');
        },
        ...overrides,
    };

    return {calls, ports};
};

describe('applyPendingRestore', () => {
    it('does nothing without a staged backup', async () => {
        const {calls, ports} = setup({readStaged: () => Promise.resolve(null)});

        expect(await applyPendingRestore(ports)).toBe('none');
        expect(calls).toEqual([]);
    });

    it('validates, replaces, then clears the staged file', async () => {
        const {calls, ports} = setup();

        expect(await applyPendingRestore(ports)).toBe('restored');
        expect(calls).toEqual([
            'validate',
            'replace',
            'clear',
        ]);
    });

    it('drops an invalid staged file without touching the database', async () => {
        const {calls, ports} = setup({validate: () => Promise.reject(new Error('bad'))});

        expect(await applyPendingRestore(ports)).toBe('discarded');
        expect(calls).toEqual(['report', 'clear']);
    });

    it('keeps the staged file for a retry when replacing fails', async () => {
        const {calls, ports} = setup({replace: () => Promise.reject(new Error('quota'))});

        await expect(applyPendingRestore(ports)).rejects.toThrow('quota');
        expect(calls).toEqual(['validate', 'report']);
    });
});

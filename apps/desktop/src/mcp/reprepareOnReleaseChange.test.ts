import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    markManualMcpPrepared,
    reprepareManualMcpOnReleaseChange,
} from './reprepareOnReleaseChange';

const createStorage = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial));

    return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
    };
};

describe('re-preparing the manual MCP executable', () => {
    it('does nothing on the first start and records the Release', async () => {
        const storage = createStorage();
        const prepare = vi.fn(() => Promise.resolve());

        expect(await reprepareManualMcpOnReleaseChange('1.0.0', storage, prepare)).toBe('skipped');
        expect(prepare).not.toHaveBeenCalled();
        expect(storage.getItem('stagistic.desktop.lastStartedRelease')).toBe('1.0.0');
    });

    it('re-prepares after a Release change when it was prepared before', async () => {
        const storage = createStorage({'stagistic.desktop.lastStartedRelease': '1.0.0'});
        const prepare = vi.fn(() => Promise.resolve());

        markManualMcpPrepared(storage);
        expect(await reprepareManualMcpOnReleaseChange('1.0.1', storage, prepare)).toBe('prepared');
        expect(prepare).toHaveBeenCalledTimes(1);
        expect(storage.getItem('stagistic.desktop.lastStartedRelease')).toBe('1.0.1');
    });

    it('skips when it was never prepared or the Release is unchanged', async () => {
        const prepare = vi.fn(() => Promise.resolve());
        const never = createStorage({'stagistic.desktop.lastStartedRelease': '1.0.0'});
        const same = createStorage({'stagistic.desktop.lastStartedRelease': '1.0.0'});

        markManualMcpPrepared(same);
        expect(await reprepareManualMcpOnReleaseChange('1.0.1', never, prepare)).toBe('skipped');
        expect(await reprepareManualMcpOnReleaseChange('1.0.0', same, prepare)).toBe('skipped');
        expect(prepare).not.toHaveBeenCalled();
    });

    it('retries next start when preparing fails', async () => {
        const storage = createStorage({'stagistic.desktop.lastStartedRelease': '1.0.0'});

        markManualMcpPrepared(storage);
        expect(await reprepareManualMcpOnReleaseChange('1.0.1', storage, () => Promise.reject(new Error('x')))).toBe('failed');
        expect(storage.getItem('stagistic.desktop.lastStartedRelease')).toBe('1.0.0');
    });
});

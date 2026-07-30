import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    hasCurrentPrereleaseAcknowledgement,
    storeCurrentPrereleaseAcknowledgement,
} from './acknowledgement';

const STORAGE_KEY = 'stagistic.web.prereleaseAcknowledgement';

class MemoryStorage {
    readonly #values = new Map<string, string>();

    constructor(value?: string) {
        if (value !== undefined) {
            this.#values.set(STORAGE_KEY, value);
        }
    }

    getItem = (key: string) => this.#values.get(key) ?? null;

    setItem = (key: string, value: string) => {
        this.#values.set(key, value);
    };
}

describe('prerelease acknowledgement', () => {
    it('requires acknowledgement when no version is stored', () => {
        expect(hasCurrentPrereleaseAcknowledgement(new MemoryStorage())).toBe(false);
    });

    it('accepts only the current acknowledgement version', () => {
        expect(hasCurrentPrereleaseAcknowledgement(new MemoryStorage('1'))).toBe(true);
    });

    it.each([
        '0',
        '2',
        'invalid',
        '',
    ])('rejects non-current version %j', version => {
        expect(hasCurrentPrereleaseAcknowledgement(new MemoryStorage(version))).toBe(false);
    });

    it('requires acknowledgement when storage cannot be read', () => {
        const storage = {
            getItem: () => {
                throw new Error('Storage is unavailable');
            },
        };

        expect(hasCurrentPrereleaseAcknowledgement(storage)).toBe(false);
    });

    it('stores an acknowledgement that is accepted by a subsequent read', () => {
        const storage = new MemoryStorage();

        expect(storeCurrentPrereleaseAcknowledgement(storage)).toBe(true);
        expect(storage.getItem(STORAGE_KEY)).toBe('1');
        expect(hasCurrentPrereleaseAcknowledgement(storage)).toBe(true);
    });

    it('reports when acknowledgement cannot be stored', () => {
        const storage = {
            setItem: () => {
                throw new Error('Storage is unavailable');
            },
        };

        expect(storeCurrentPrereleaseAcknowledgement(storage)).toBe(false);
    });
});

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {getUuidv7Timestamp, uuidv7} from './uuidv7';

const UUID_V7_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidv7', () => {
    it('produces a valid version-7 uuid', () => {
        expect(uuidv7()).toMatch(UUID_V7_PATTERN);
    });

    it('produces distinct ids across calls', () => {
        const ids = new Set(Array.from({length: 100}, () => uuidv7()));

        expect(ids.size).toBe(100);
    });
});

describe('getUuidv7Timestamp', () => {
    it('reads the creation time of a uuidv7', () => {
        expect(getUuidv7Timestamp('01a15405-90a1-7320-bb84-3b5dd3842e5b')).toBe(Date.UTC(2026, 9, 19, 11, 56, 53, 281));
    });

    it('returns null for other strings', () => {
        expect(getUuidv7Timestamp('blob-1')).toBeNull();
        expect(getUuidv7Timestamp('9b2f0c1e-1f1a-4c3b-8a2d-0e5f6a7b8c9d')).toBeNull();
    });
});

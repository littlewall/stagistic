import {
    describe, expect, it,
} from 'vite-plus/test';

import {uuidv7} from './uuidv7';

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

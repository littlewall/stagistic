import {
    describe, expect, it,
} from 'vite-plus/test';

import {createNodeId} from './nodeId';

describe('createNodeId', () => {
    it('returns a 6-character id from the nanoid alphabet', () => {
        const id = createNodeId();

        expect(id).toHaveLength(6);
        expect(id).toMatch(/^[A-Za-z0-9_-]{6}$/);
    });

    it('produces distinct ids across calls', () => {
        const ids = new Set(Array.from({length: 100}, () => createNodeId()));

        expect(ids.size).toBe(100);
    });
});

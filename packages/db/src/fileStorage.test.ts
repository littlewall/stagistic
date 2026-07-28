import {
    describe, expect, it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from './fileStorage';

describe('InMemoryFileStorage', () => {
    it('round-trips a blob and returns a key', async () => {
        const storage = new InMemoryFileStorage();
        const blob = new Blob(['hello'], {type: 'application/pdf'});

        const key = await storage.save(blob);
        const loaded = await storage.get(key);

        expect(typeof key).toBe('string');
        expect(await loaded?.text()).toBe('hello');
    });

    it('returns null for an unknown key', async () => {
        const storage = new InMemoryFileStorage();

        expect(await storage.get('missing')).toBeNull();
    });

    it('deletes a stored blob', async () => {
        const storage = new InMemoryFileStorage();
        const key = await storage.save(new Blob(['x']));

        await storage.delete(key);

        expect(await storage.get(key)).toBeNull();
    });
});

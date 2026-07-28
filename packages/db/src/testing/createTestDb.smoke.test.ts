import {
    describe, expect, it,
} from 'vite-plus/test';

import {scripts} from '../schema';
import {createTestDb, seedScript} from './createTestDb';

describe('createTestDb', () => {
    it('applies migrations and seeds a script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');

        const rows = await db.select().from(scripts);

        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe('script-1');
    });
});

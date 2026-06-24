import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    createTestDb, seedScript,
} from '../../testing/createTestDb';
import {
    bulkDeleteScriptCues, bulkUpsertScriptCues, listScriptCues,
} from './cues';

describe('script cues queries', () => {
    it('upserts then lists cues for a script ordered by number', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c2', scriptId: 's1', cueNumber: 2, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b3', endBlockId: 'b3', createdAt: 1, updatedAt: 1,
            }, {
                id: 'c1', scriptId: 's1', cueNumber: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            },
        ]);

        const rows = await listScriptCues(db, 's1');

        expect(rows.map(row => row.id)).toEqual(['c1', 'c2']);
        expect(rows[0]).toMatchObject({
            cueNumber: 1, mode: 'open', title: 'Night', startBlockId: 'b1', endBlockId: 'b2',
        });
    });

    it('upsert updates an existing cue by id', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', cueNumber: 1, mode: 'open', title: 'A', kind: null, startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            },
        ]);
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', cueNumber: 1, mode: 'hit', title: 'B', kind: null, startBlockId: 'b1', endBlockId: 'b1', createdAt: 1, updatedAt: 2,
            },
        ]);

        const rows = await listScriptCues(db, 's1');

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            mode: 'hit', title: 'B', endBlockId: 'b1',
        });
    });

    it('deletes cues by id', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', cueNumber: 1, mode: 'open', title: 'N', kind: null, startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            },
        ]);
        await bulkDeleteScriptCues(db, ['c1']);

        expect(await listScriptCues(db, 's1')).toHaveLength(0);
    });
});

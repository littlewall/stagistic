import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    createTestDb, seedScript,
} from '../../testing/createTestDb';
import {
    bulkDeleteScriptCues,
    bulkUnassignScriptCues,
    bulkUpsertScriptCues,
    deleteScriptCue,
    insertScriptCue,
    listScriptCues,
    unassignScriptCue,
    updateScriptCue,
} from './cues';

describe('script cues queries', () => {
    it('upserts then lists cues for a script ordered by number', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c2', scriptId: 's1', sceneNumber: 1, indexInScene: 1, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b3', endBlockId: 'b3', createdAt: 1, updatedAt: 1,
            }, {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            },
        ]);

        const rows = await listScriptCues(db, 's1');

        expect(rows.map(row => row.id)).toEqual(['c1', 'c2']);
        expect(rows[0]).toMatchObject({
            sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', startBlockId: 'b1', endBlockId: 'b2',
        });
    });

    it('upsert updates an existing cue by id', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'A', kind: null, startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            },
        ]);
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'hit', title: 'B', kind: null, startBlockId: 'b1', endBlockId: 'b1', createdAt: 1, updatedAt: 2,
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
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'N', kind: null, startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            },
        ]);
        await bulkDeleteScriptCues(db, ['c1']);

        expect(await listScriptCues(db, 's1')).toHaveLength(0);
    });

    it('stores unassigned cues', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await insertScriptCue(db, {
            id: 'c1', scriptId: 's1', sceneNumber: 0, indexInScene: 0, mode: 'open', title: 'Opening', kind: 'song', startBlockId: null, endBlockId: null, createdAt: 1, updatedAt: 1,
        });

        const rows = await listScriptCues(db, 's1');

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            id: 'c1', title: 'Opening', kind: 'song', startBlockId: null, endBlockId: null,
        });
    });

    it('updates cue title and kind within its script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await seedScript(db, 's2');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: 'song', startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            }, {
                id: 'c2', scriptId: 's2', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: 'song', startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            },
        ]);

        await updateScriptCue(db, {
            scriptId: 's1',
            cueId: 'c1',
            title: 'Overture',
            kind: 'instrumental',
            updatedAt: 2,
        });

        expect((await listScriptCues(db, 's1'))[0]).toMatchObject({
            title: 'Overture', kind: 'instrumental', updatedAt: 2,
        });
        expect((await listScriptCues(db, 's2'))[0]).toMatchObject({
            title: 'Night', kind: 'song', updatedAt: 1,
        });
    });

    it('unassigns cues without deleting them', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            },
        ]);

        await bulkUnassignScriptCues(db, ['c1'], 2);

        const rows = await listScriptCues(db, 's1');

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            id: 'c1', title: 'Night', startBlockId: null, endBlockId: null, updatedAt: 2,
        });
    });

    it('unassigns one cue scoped to its script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await seedScript(db, 's2');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            }, {
                id: 'c2', scriptId: 's2', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2', createdAt: 1, updatedAt: 1,
            },
        ]);

        await unassignScriptCue(db, {
            scriptId: 's1', cueId: 'c1', updatedAt: 2,
        });

        expect((await listScriptCues(db, 's1'))[0]).toMatchObject({
            id: 'c1', startBlockId: null, endBlockId: null,
        });
        expect((await listScriptCues(db, 's2'))[0]).toMatchObject({
            id: 'c2', startBlockId: 'b1', endBlockId: 'b2',
        });
    });

    it('deletes one cue scoped to its script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's1');
        await seedScript(db, 's2');
        await bulkUpsertScriptCues(db, [
            {
                id: 'c1', scriptId: 's1', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: null, createdAt: 1, updatedAt: 1,
            }, {
                id: 'c2', scriptId: 's2', sceneNumber: 1, indexInScene: 0, mode: 'open', title: 'Dawn', kind: null, startBlockId: null, endBlockId: null, createdAt: 1, updatedAt: 1,
            },
        ]);

        await deleteScriptCue(db, {scriptId: 's1', cueId: 'c1'});

        expect(await listScriptCues(db, 's1')).toHaveLength(0);
        expect(await listScriptCues(db, 's2')).toHaveLength(1);
    });
});

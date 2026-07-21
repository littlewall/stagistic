import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    insertScriptMusic,
    listScriptMusic,
} from '../../queries';
import {
    createTestDb, seedScript,
} from '../../testing/createTestDb';
import {createDocumentPersister} from './persistDocumentDelta';

const SCRIPT_ID = 'script-1';

const docWithMusic = (title: string) => ({
    type: 'doc',
    content: [
        {
            type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}],
        }, {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'c1', mode: 'open', title, kind: null,
                    },
                },
            ],
        },
    ],
});

const docWithoutMusic = () => ({
    type: 'doc',
    content: [
        {
            type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}],
        }, {
            type: 'stageDirection', attrs: {id: 'b1'}, content: [{type: 'text', text: 'No music'}],
        },
    ],
});

describe('persist music', () => {
    it('assigns an existing music, updates its title, then unassigns it', async () => {
        const {db} = await createTestDb();

        await seedScript(db, SCRIPT_ID);
        await insertScriptMusic(db, {
            id: 'c1',
            scriptId: SCRIPT_ID,
            sceneNumber: 0,
            indexInScene: 0,
            mode: 'open',
            title: 'Night',
            kind: 'song',
            startBlockId: null,
            endBlockId: null,
            createdAt: 1,
            updatedAt: 1,
        });

        const persister = createDocumentPersister(SCRIPT_ID);

        await persister.persist(db, docWithMusic('Night') as never);

        const afterCreate = await listScriptMusic(db, SCRIPT_ID);

        expect(afterCreate).toHaveLength(1);
        expect(afterCreate[0]).toMatchObject({
            id: 'c1', title: 'Night', startBlockId: 'b1', endBlockId: null,
        });

        await persister.persist(db, docWithMusic('Dawn') as never);

        const afterRename = await listScriptMusic(db, SCRIPT_ID);

        expect(afterRename).toHaveLength(1);
        expect(afterRename[0]).toMatchObject({id: 'c1', title: 'Dawn'});

        await persister.persist(db, docWithoutMusic() as never);

        const afterUnassign = await listScriptMusic(db, SCRIPT_ID);

        expect(afterUnassign).toHaveLength(1);
        expect(afterUnassign[0]).toMatchObject({
            id: 'c1', title: 'Dawn', startBlockId: null, endBlockId: null,
        });
    });

    it('creates catalog entries for music restored from the document', async () => {
        const {db} = await createTestDb();

        await seedScript(db, SCRIPT_ID);

        const persister = createDocumentPersister(SCRIPT_ID);

        await persister.persist(db, docWithMusic('Night') as never);

        expect(await listScriptMusic(db, SCRIPT_ID)).toMatchObject([
            {
                id: 'c1',
                title: 'Night',
                startBlockId: 'b1',
                endBlockId: null,
            },
        ]);
    });
});

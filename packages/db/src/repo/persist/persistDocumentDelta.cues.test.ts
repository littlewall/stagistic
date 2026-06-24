import {
    describe, expect, it,
} from 'vite-plus/test';

import {listScriptCues} from '../../queries';
import {
    createTestDb, seedScript,
} from '../../testing/createTestDb';
import {createDocumentPersister} from './persistDocumentDelta';

const SCRIPT_ID = 'script-1';

const docWithCue = (title: string) => ({
    type: 'doc',
    content: [
        {
            type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}],
        }, {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {
                    type: 'cueStart',
                    attrs: {
                        cueId: 'c1', mode: 'open', title, kind: null,
                    },
                },
            ],
        },
    ],
});

const docWithoutCue = () => ({
    type: 'doc',
    content: [
        {
            type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene'}],
        }, {
            type: 'stageDirection', attrs: {id: 'b1'}, content: [{type: 'text', text: 'No cue'}],
        },
    ],
});

describe('persist cues', () => {
    it('writes a cue, updates its title, then removes it', async () => {
        const {db} = await createTestDb();

        await seedScript(db, SCRIPT_ID);

        const persister = createDocumentPersister(SCRIPT_ID);

        await persister.persist(db, docWithCue('Night') as never);

        const afterCreate = await listScriptCues(db, SCRIPT_ID);

        expect(afterCreate).toHaveLength(1);
        expect(afterCreate[0]).toMatchObject({
            id: 'c1', title: 'Night', startBlockId: 'b1', endBlockId: null,
        });

        await persister.persist(db, docWithCue('Dawn') as never);

        const afterRename = await listScriptCues(db, SCRIPT_ID);

        expect(afterRename).toHaveLength(1);
        expect(afterRename[0]).toMatchObject({id: 'c1', title: 'Dawn'});

        await persister.persist(db, docWithoutCue() as never);

        expect(await listScriptCues(db, SCRIPT_ID)).toHaveLength(0);
    });
});

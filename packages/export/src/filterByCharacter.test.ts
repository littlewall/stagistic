import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {filterScriptByCharacter} from './filterByCharacter';
import {
    block,
    sampleDoc,
} from './testUtils';

const characters = [
    {
        id: 'alice', key: 'ALICE', displayName: 'Alice',
    }, {
        id: 'bob', key: 'BOB', displayName: 'Bob',
    },
];

describe('filterScriptByCharacter', () => {
    it('mode \'all\' returns the same document reference', () => {
        const doc = sampleDoc();

        expect(filterScriptByCharacter(doc, {mode: 'all', characterIds: []}, characters)).toBe(doc);
    });

    it('keeps only scenes mentioning a selected character', () => {
        const out = filterScriptByCharacter(
            sampleDoc(),
            {mode: 'only', characterIds: ['bob']},
            characters,
        );
        const ids = out.content.map(node => node.attrs?.id);

        expect(ids).toContain('sceneB');
        expect(ids).not.toContain('sceneA');
    });

    it('drops act headings when all scenes are removed', () => {
        const out = filterScriptByCharacter(
            sampleDoc(),
            {mode: 'only', characterIds: ['nobody']},
            characters,
        );

        expect(out.content).toHaveLength(0);
    });

    it('keeps direct and member-group scenes without changing group text', () => {
        const doc = {
            type: 'doc' as const,
            content: [
                block('scene', 'direct-scene', 'Direct'),
                block('stageDirection', 'direct-cue', '@ANNA enters.'),
                block('scene', 'member-group-scene', 'Member group'),
                block('character', 'all-cue', 'ALL'),
                block('scene', 'unrelated-group-scene', 'Unrelated group'),
                block('character', 'chorus-cue', 'CHORUS'),
                block('scene', 'empty-group-scene', 'Empty group'),
                block('character', 'empty-cue', 'EMPTY'),
            ],
        };
        const out = filterScriptByCharacter(
            doc,
            {mode: 'only', characterIds: ['anna']},
            [{id: 'anna', key: 'ANNA', displayName: 'Anna'}],
            [
                {id: 'all', key: 'ALL', memberIds: ['anna']},
                {id: 'chorus', key: 'CHORUS', memberIds: ['bob']},
                {id: 'empty', key: 'EMPTY', memberIds: []},
            ],
        );
        const ids = out.content.map(node => node.attrs?.id);

        expect(ids).toContain('direct-scene');
        expect(ids).toContain('member-group-scene');
        expect(ids).not.toContain('unrelated-group-scene');
        expect(ids).not.toContain('empty-group-scene');
        expect(out.content.find(node => node.attrs?.id === 'all-cue')).toEqual(
            block('character', 'all-cue', 'ALL'),
        );
    });
});

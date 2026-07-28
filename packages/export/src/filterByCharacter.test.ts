import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {filterScriptByCharacter} from './filterByCharacter';
import {sampleDoc} from './testUtils';

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
});

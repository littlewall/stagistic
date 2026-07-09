import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    groupScenes,
    sceneMentionsCharacter,
} from './scenes';
import {sampleDoc} from './testUtils';

describe('groupScenes', () => {
    it('splits content into act and scene groups', () => {
        const groups = groupScenes(sampleDoc());

        expect(groups.map(group => group.sceneBlockId)).toEqual([
            null,
            'sceneA',
            'sceneB',
        ]);
    });
});

describe('sceneMentionsCharacter', () => {
    it('matches character mentions inside scene blocks', () => {
        const groups = groupScenes(sampleDoc());

        expect(sceneMentionsCharacter(groups[1], {id: 'alice', key: 'ALICE'})).toBe(true);
        expect(sceneMentionsCharacter(groups[1], {id: 'bob', key: 'BOB'})).toBe(false);
        expect(sceneMentionsCharacter(groups[2], {id: 'bob', key: 'BOB'})).toBe(true);
    });
});

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {onCardRecords, type SceneCardRecord} from './buildSceneChips';

const record = (headingBlockId: string, characterId: string, onCard?: boolean): SceneCardRecord => ({
    headingBlockId,
    characterId,
    note: null,
    arcValue: 50,
    ...onCard === undefined ? {} : {onCard},
});

describe('onCardRecords', () => {
    it('drops records that only carry an arc point and keeps the rest, in order', () => {
        const records = [
            record('s1', 'a'),
            record('s1', 'b', false),
            record('s2', 'c', true),
            record('s2', 'd', false),
        ];

        expect(onCardRecords(records).map(item => item.characterId)).toEqual(['a', 'c']);
    });
});

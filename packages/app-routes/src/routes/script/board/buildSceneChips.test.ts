import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {type SceneCardRecord, selectCardRecords} from './buildSceneChips';

const record = (headingBlockId: string, characterId: string, onCard?: boolean, arcValue: number | null = null): SceneCardRecord => ({
    headingBlockId,
    characterId,
    note: null,
    arcValue,
    ...onCard === undefined ? {} : {onCard},
});

describe('selectCardRecords', () => {
    it('counts a legacy off-card record with an arc value as on the card', () => {
        const records = [record('s1', 'a', false, 40)];

        expect(selectCardRecords(records, new Set()).map(item => item.characterId)).toEqual(['a']);
    });

    it('keeps an off-card record with a note when the script no longer places the character', () => {
        const records = [
            {...record('s1', 'a', false), note: 'kept'},
            {...record('s1', 'b', false), note: ''},
        ];

        expect(selectCardRecords(records, new Set()).map(item => item.characterId)).toEqual(['a']);
    });

    it('drops an off-card record without a value unless the script places the character', () => {
        const records = [
            record('s1', 'a'),
            record('s1', 'b', false),
            record('s2', 'c', false),
            record('s2', 'd', true),
        ];

        expect(selectCardRecords(records, new Set(['s2:c'])).map(item => item.characterId)).toEqual([
            'a',
            'c',
            'd',
        ]);
    });
});

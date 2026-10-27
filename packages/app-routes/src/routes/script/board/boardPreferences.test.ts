import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    DEFAULT_BOARD_PREFERENCES,
    getBoardPreferencesKey,
    parseBoardPreferences,
} from './boardPreferences';

describe('parseBoardPreferences', () => {
    it('reads a stored value', () => {
        expect(parseBoardPreferences({
            characterIds: ['a', 'b'],
            density: 'title',
            showMentioned: false,
        })).toEqual({
            characterIds: ['a', 'b'],
            density: 'title',
            showMentioned: false,
        });
    });

    it('falls back field by field on stale data', () => {
        expect(parseBoardPreferences({
            characterIds: ['a', 4],
            density: 'wide',
            showMentioned: 'yes',
        })).toEqual({
            ...DEFAULT_BOARD_PREFERENCES,
            characterIds: ['a'],
        });
        expect(parseBoardPreferences({})).toEqual(DEFAULT_BOARD_PREFERENCES);
    });

    it.each([
        null,
        'text',
        3,
    ])('ignores %j', value => {
        expect(parseBoardPreferences(value)).toBeUndefined();
    });
});

describe('getBoardPreferencesKey', () => {
    it('is scoped per script', () => {
        expect(getBoardPreferencesKey('s1')).not.toBe(getBoardPreferencesKey('s2'));
    });
});

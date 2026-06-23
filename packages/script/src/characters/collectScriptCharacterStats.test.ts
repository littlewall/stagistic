import {
    describe, expect, it,
} from 'vite-plus/test';

import type {ScriptDocument} from '../document';
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
} from './characterTagMarks';
import {collectScriptCharacterStats} from './collectScriptCharacterStats';

const tagMark = (key: string, characterId: string | null) => ({
    type: CHARACTER_TAG_MARK_NAME,
    attrs: {[CHARACTER_TAG_KEY_ATTR]: key, [CHARACTER_TAG_ID_ATTR]: characterId},
});

const doc: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {
                    type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')],
                },
                {type: 'text', text: ' meets '},
                {
                    type: 'text', text: 'Bob', marks: [tagMark('BOB', null)],
                },
                {type: 'text', text: '.'},
            ],
        },
    ],
};

describe('collectScriptCharacterStats with tag marks', () => {
    it('counts confirmed tags by id and unconfirmed tags by key', () => {
        const stats = collectScriptCharacterStats(doc, new Set(['char-anna']));

        expect(stats.countsByKey.get('ANNA')).toBe(1);
        expect(stats.countsByKey.get('BOB')).toBe(1);
        expect(stats.confirmedCountsById.get('char-anna')).toBe(1);
        expect(stats.unconfirmedCountsByKey.get('BOB')).toBe(1);
        expect(stats.unconfirmedCountsByKey.has('ANNA')).toBe(false);
    });
});

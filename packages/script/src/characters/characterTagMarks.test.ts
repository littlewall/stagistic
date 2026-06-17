import {
    describe, expect, it,
} from 'vite-plus/test';

import type {ScriptNode} from '../document';
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    collectCharacterTagRefByKey,
    collectCharacterTags,
    countCharacterTagsByKey,
    mapCharacterTagMarks,
} from './characterTagMarks';

const tagMark = (key: string, characterId: string | null) => ({
    type: CHARACTER_TAG_MARK_NAME,
    attrs: {[CHARACTER_TAG_KEY_ATTR]: key, [CHARACTER_TAG_ID_ATTR]: characterId},
});

// "Anna goes in. Steve follows Anna." — first Anna + Steve tagged, second Anna plain.
const block = (): ScriptNode => ({
    type: 'stageDirection',
    attrs: {id: 'b1'},
    content: [
        {
            type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')],
        },
        {type: 'text', text: ' goes in. '},
        {
            type: 'text', text: 'Steve', marks: [tagMark('STEVE', null)],
        },
        {type: 'text', text: ' follows Anna.'},
    ],
});

describe('characterTagMarks', () => {
    it('collects each tagged span as a per-occurrence tag', () => {
        const tags = collectCharacterTags(block());

        expect(tags).toEqual([
            {
                key: 'ANNA', characterId: 'char-anna', text: 'Anna',
            }, {
                key: 'STEVE', characterId: null, text: 'Steve',
            },
        ]);
    });

    it('counts tags per key (per occurrence, not deduped)', () => {
        const node: ScriptNode = {
            type: 'stageDirection',
            attrs: {id: 'b2'},
            content: [
                {
                    type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')],
                },
                {type: 'text', text: ' and '},
                {
                    type: 'text', text: 'Anna', marks: [tagMark('ANNA', 'char-anna')],
                },
            ],
        };

        expect(countCharacterTagsByKey(node)).toEqual(new Map([['ANNA', 2]]));
    });

    it('collects confirmed refs only (characterId set)', () => {
        expect(collectCharacterTagRefByKey(block())).toEqual({ANNA: 'char-anna'});
    });

    it('ignores placeholder-only tags from pending editor state', () => {
        const node: ScriptNode = {
            type: 'stageDirection',
            attrs: {id: 'b3'},
            content: [
                {
                    type: 'text',
                    text: '\u200b',
                    marks: [tagMark('', null)],
                },
            ],
        };

        expect(collectCharacterTags(node)).toEqual([]);
        expect(countCharacterTagsByKey(node)).toEqual(new Map());
        expect(collectCharacterTagRefByKey(node)).toEqual({});
    });

    it('mapCharacterTagMarks rewrites matching mark attrs immutably', () => {
        const next = mapCharacterTagMarks(block(), tag => {
            return tag.characterId === 'char-anna' ? {characterId: 'char-anna-2'} : null;
        });

        expect(collectCharacterTagRefByKey(next)).toEqual({ANNA: 'char-anna-2'});
        // original untouched
        expect(collectCharacterTagRefByKey(block())).toEqual({ANNA: 'char-anna'});
    });
});

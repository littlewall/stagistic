import {
    describe, expect, it,
} from 'vitest';

import type {ScriptDocument} from '../document';
import {
    linkCharacterRefInScriptDocument,
    replaceCharacterRefIdInScriptDocument,
    unlinkCharacterRefInScriptDocument,
} from './characterRefsInScriptDocument';
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    collectCharacterTagRefByKey,
} from './characterTagMarks';

const tagMark = (key: string, characterId: string | null) => ({
    type: CHARACTER_TAG_MARK_NAME,
    attrs: {[CHARACTER_TAG_KEY_ATTR]: key, [CHARACTER_TAG_ID_ATTR]: characterId},
});

const docWithTag = (characterId: string | null): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {
                    type: 'text', text: 'Anna', marks: [tagMark('ANNA', characterId)],
                },
            ],
        },
    ],
});

describe('characterRefsInScriptDocument with tags', () => {
    it('links an unconfirmed tag by key', () => {
        const {value, changed} = linkCharacterRefInScriptDocument(docWithTag(null), 'Anna', 'char-anna');

        expect(changed).toBe(true);
        expect(collectCharacterTagRefByKey(value.content[0])).toEqual({ANNA: 'char-anna'});
    });

    it('unlinks a tag by characterId', () => {
        const {value, changed} = unlinkCharacterRefInScriptDocument(docWithTag('char-anna'), 'char-anna');

        expect(changed).toBe(true);
        expect(collectCharacterTagRefByKey(value.content[0])).toEqual({});
    });

    it('replaces a tag characterId', () => {
        const {value, changed} = replaceCharacterRefIdInScriptDocument(docWithTag('char-anna'), 'char-anna', 'char-merged');

        expect(changed).toBe(true);
        expect(collectCharacterTagRefByKey(value.content[0])).toEqual({ANNA: 'char-merged'});
    });
});

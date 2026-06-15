import {
    describe, expect, it,
} from 'vitest';

import type {ScriptDocument} from '../document';
import {renameCharacterInScriptDocument} from './renameCharacterInScriptDocument';

describe('renameCharacterInScriptDocument with tags', () => {
    it('renames the text and key of tagged spans for the character', () => {
        const doc: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'b1'},
                    content: [
                        {
                            type: 'text',
                            text: 'Anna',
                            marks: [{type: 'characterTag', attrs: {characterKey: 'ANNA', characterId: 'char-anna'}}],
                        }, {type: 'text', text: ' waits for Anna.'},
                    ],
                },
            ],
        };
        const {value, changed} = renameCharacterInScriptDocument(
            doc,
            'Anna',
            'Anička',
            name => name,
            {characterId: 'char-anna'},
        );

        expect(changed).toBe(true);

        const span = value.content[0].content?.[0];

        expect(span?.text).toBe('Anička');
        expect(span?.marks?.[0]?.attrs?.characterKey).toBe('ANIČKA');
        // plain prose untouched
        expect(value.content[0].content?.[1]?.text).toBe(' waits for Anna.');
    });
});

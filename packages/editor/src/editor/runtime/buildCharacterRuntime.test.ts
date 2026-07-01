import {splitCharacterTokens} from '@stagistic/script';
import {Schema} from '@tiptap/pm/model';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildCharacterRuntime} from './buildCharacterRuntime';

const schema = new Schema({
    nodes: {
        doc: {content: 'character+'},
        text: {group: 'inline'},
        character: {
            group: 'block',
            content: 'text*',
            attrs: {
                id: {default: 'block-1'},
                blockType: {default: 'character'},
                characterRefs: {default: null},
            },
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
        },
    },
    marks: {},
});

describe('buildCharacterRuntime', () => {
    it('does not extend a name decoration into whitespace left before the delimiter', () => {
        const text = 'TOMMY / REBECCA / MICHAEL';
        const tokens = splitCharacterTokens(text);
        const firstToken = tokens[0];

        expect(firstToken.value).toBe('TOMMY');
        // The imported/padded form has a trailing space before the delimiter.
        expect(firstToken.end).toBeGreaterThan(firstToken.valueEnd);

        const block = schema.node('character', {id: 'block-1'}, [schema.text(text)]);
        const doc = schema.node('doc', null, [block]);
        const blockStart = 1;

        const {decorations} = buildCharacterRuntime({doc});
        const nameDecoration = decorations
            .find(blockStart, blockStart + firstToken.valueEnd)
            .find(decoration => decoration.from === blockStart + firstToken.valueStart);

        expect(nameDecoration?.to).toBe(blockStart + firstToken.valueEnd);
    });

    it('still decorates the full name for the compact live-typed form', () => {
        const text = 'TOMMY/REBECCA/MICHAEL';
        const tokens = splitCharacterTokens(text);
        const firstToken = tokens[0];

        expect(firstToken.end).toBe(firstToken.valueEnd);

        const block = schema.node('character', {id: 'block-1'}, [schema.text(text)]);
        const doc = schema.node('doc', null, [block]);
        const blockStart = 1;

        const {decorations} = buildCharacterRuntime({doc});
        const nameDecoration = decorations
            .find(blockStart, blockStart + firstToken.valueEnd)
            .find(decoration => decoration.from === blockStart + firstToken.valueStart);

        expect(nameDecoration?.to).toBe(blockStart + firstToken.valueEnd);
    });
});

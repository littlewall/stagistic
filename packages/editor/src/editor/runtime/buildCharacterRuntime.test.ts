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

    it('extends the pill through a trailing space the cursor is typing at the name end', () => {
        // Live-typed "THOMAS " — cursor sits after the space, still inside the name.
        const text = 'THOMAS ';
        const tokens = splitCharacterTokens(text);
        const firstToken = tokens[0];

        expect(firstToken.value).toBe('THOMAS');
        expect(firstToken.end).toBeGreaterThan(firstToken.valueEnd);

        const block = schema.node('character', {id: 'block-1'}, [schema.text(text)]);
        const doc = schema.node('doc', null, [block]);
        const blockStart = 1;
        const cursor = blockStart + firstToken.end;

        const {decorations} = buildCharacterRuntime({doc, selectionFrom: cursor});
        const nameDecoration = decorations
            .find(blockStart, cursor)
            .find(decoration => decoration.from === blockStart + firstToken.valueStart);

        expect(nameDecoration?.to).toBe(cursor);
    });

    it('extends the pill only up to the cursor when it sits mid trailing-space run', () => {
        const text = 'THOMAS   ';
        const tokens = splitCharacterTokens(text);
        const firstToken = tokens[0];
        const block = schema.node('character', {id: 'block-1'}, [schema.text(text)]);
        const doc = schema.node('doc', null, [block]);
        const blockStart = 1;
        // Cursor one space past the name, two trailing spaces remain to its right.
        const cursor = blockStart + firstToken.valueEnd + 1;

        const {decorations} = buildCharacterRuntime({doc, selectionFrom: cursor});
        const nameDecoration = decorations
            .find(blockStart, blockStart + firstToken.end)
            .find(decoration => decoration.from === blockStart + firstToken.valueStart);

        expect(nameDecoration?.to).toBe(cursor);
    });

    it('does not extend the pill into a trailing space when the cursor is elsewhere', () => {
        const text = 'THOMAS ';
        const tokens = splitCharacterTokens(text);
        const firstToken = tokens[0];
        const block = schema.node('character', {id: 'block-1'}, [schema.text(text)]);
        const doc = schema.node('doc', null, [block]);
        const blockStart = 1;
        // Cursor at the very start of the block, not near the trailing space.
        const cursor = blockStart;

        const {decorations} = buildCharacterRuntime({doc, selectionFrom: cursor});
        const nameDecoration = decorations
            .find(blockStart, blockStart + firstToken.valueEnd)
            .find(decoration => decoration.from === blockStart + firstToken.valueStart);

        expect(nameDecoration?.to).toBe(blockStart + firstToken.valueEnd);
    });
});

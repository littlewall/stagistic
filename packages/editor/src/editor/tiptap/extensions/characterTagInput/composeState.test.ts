import {CHARACTER_TAG_MARK_NAME} from '@stagistic/script';
import {Schema} from '@tiptap/pm/model';
import {
    EditorState,
    TextSelection,
} from '@tiptap/pm/state';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    detectCompose,
} from './composeState';
import {
    PENDING_TAG_SPACE_CHARACTER,
    PLACEHOLDER_CHARACTER,
} from './constants';

const schema = new Schema({
    nodes: {
        doc: {content: 'stageDirection+'},
        text: {group: 'inline'},
        stageDirection: {
            group: 'block',
            content: 'text*',
            attrs: {
                id: {default: 'block-1'},
                blockType: {default: 'stageDirection'},
            },
            toDOM: () => ['p', 0],
            parseDOM: [{tag: 'p'}],
        },
    },
    marks: {
        [CHARACTER_TAG_MARK_NAME]: {
            attrs: {
                characterKey: {default: ''},
                characterId: {default: null},
            },
            toDOM: () => ['span', 0],
            parseDOM: [{tag: 'span'}],
        },
    },
});

const createMarkedState = (text: string) => {
    const mark = schema.mark(CHARACTER_TAG_MARK_NAME, {
        characterKey: text,
        characterId: null,
    });
    const block = schema.node('stageDirection', null, [schema.text(text, [mark])]);
    const doc = schema.node('doc', null, [block]);

    return EditorState.create({
        schema,
        doc,
        selection: TextSelection.create(doc, 1 + text.length),
    });
};

describe('detectCompose', () => {
    it('detects compose at the start of a standalone tag range', () => {
        const state = createMarkedState(PLACEHOLDER_CHARACTER);

        expect(detectCompose(state)).toEqual({from: 1});
    });

    it('does not detect compose inside an existing character tag', () => {
        const state = createMarkedState(`JOHNNY${PENDING_TAG_SPACE_CHARACTER}@`);

        expect(detectCompose(state)).toBeNull();
    });
});

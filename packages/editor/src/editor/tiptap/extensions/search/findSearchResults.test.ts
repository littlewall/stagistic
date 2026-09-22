import type {ScriptBlockNodeType, ScriptDocument, ScriptNode} from '@stagistic/script';
import {Editor} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Text from '@tiptap/extension-text';
import {describe, expect, it} from 'vite-plus/test';

import {ScriptBlockNodes} from '../../nodes';
import {DocumentWithSettings} from '../DocumentExtension';
import {findSearchResults} from './findSearchResults';
import type {SearchCriteria} from './types';

const criteria = (query: string): SearchCriteria => ({
    query,
    caseSensitive: false,
    blockTypes: null,
});

const text = (value: string): ScriptNode => ({type: 'text', text: value});

const bold = (value: string): ScriptNode => ({
    type: 'text',
    text: value,
    marks: [{type: 'bold'}],
});

const block = (type: ScriptBlockNodeType, id: string, value: string): ScriptNode => ({
    type,
    attrs: {id},
    content: value ? [text(value)] : [],
});

const markedBlock = (type: ScriptBlockNodeType, id: string, content: ScriptNode[]): ScriptNode => ({
    type,
    attrs: {id},
    content,
});

const createDocument = (content: ScriptNode[]) => {
    const editor = new Editor({
        content: {
            type: 'doc',
            content,
        } satisfies ScriptDocument,
        extensions: [DocumentWithSettings, Text, Bold, ...ScriptBlockNodes],
    });
    const document = editor.state.doc;

    editor.destroy();

    return document;
};

describe('findSearchResults', () => {
    it('matches case-insensitively and keeps diacritics exact', () => {
        const document = createDocument([block('dialogue', 'd1', 'Light LIGHT líght')]);

        expect(findSearchResults(document, criteria('light'))).toHaveLength(2);
    });

    it('treats regex punctuation as literal text', () => {
        const document = createDocument([block('dialogue', 'd1', 'a+b? then ab')]);

        expect(findSearchResults(document, criteria('a+b?'))).toHaveLength(1);
    });

    it('matches across adjacent text nodes separated by a mark', () => {
        const document = createDocument([markedBlock('dialogue', 'd1', [text('moon'), bold('light')])]);
        const [result] = findSearchResults(document, criteria('moonlight'));

        expect(document.textBetween(result.from, result.to)).toBe('moonlight');
    });

    it('does not match across block boundaries', () => {
        const document = createDocument([block('dialogue', 'd1', 'moon'), block('dialogue', 'd2', 'light')]);

        expect(findSearchResults(document, criteria('moonlight'))).toEqual([]);
    });

    it('returns non-overlapping results in document order', () => {
        const document = createDocument([block('dialogue', 'd1', 'aaaa')]);

        expect(findSearchResults(document, criteria('aa'))).toHaveLength(2);
    });

    it('supports case-sensitive and block-type criteria', () => {
        const document = createDocument([block('dialogue', 'd1', 'Light light'), block('stageDirection', 's1', 'light')]);
        const results = findSearchResults(document, {
            query: 'Light',
            caseSensitive: true,
            blockTypes: ['dialogue'],
        });

        expect(results).toMatchObject([{blockId: 'd1', blockType: 'dialogue'}]);
    });

    it('returns no results for an empty query', () => {
        const document = createDocument([block('dialogue', 'd1', 'A light remains.')]);

        expect(findSearchResults(document, criteria(''))).toEqual([]);
    });
});

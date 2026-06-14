import {
    describe, expect, it,
} from 'vitest';

import {migrateLegacyDocument} from './migrateLegacyDocument';
import type {ScriptDocument} from './scriptDocument';

describe('migrateLegacyDocument (temporary)', () => {
    it('maps legacy node/block identifiers to the new vocabulary', () => {
        const legacy: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'fountainBlock', attrs: {blockType: 'scene_heading', id: 'b1'}, content: [{type: 'text', text: 'LES'}],
                },
                {
                    type: 'action', attrs: {id: 'b2'}, content: [{type: 'text', text: 'Anna vejde.'}],
                },
                {
                    type: 'parenthetical', attrs: {id: 'b3'}, content: [{type: 'text', text: '(tiše)'}],
                },
                {
                    type: 'character', attrs: {id: 'b4'}, content: [{type: 'text', text: 'ANNA + PETR'}],
                },
            ],
        };

        const {document, changed} = migrateLegacyDocument(legacy);

        expect(changed).toBe(true);
        expect(document.content.map(node => node.type)).toEqual([
            'scene',
            'stageDirection',
            'aside',
            'character',
        ]);
        expect(document.content[0].attrs).toEqual({id: 'b1'});
        expect(document.content[3].content?.[0]?.text).toBe('ANNA / PETR');
    });

    it('is a no-op on an already-clean document', () => {
        const clean: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'scene', attrs: {id: 'b1'}, content: [{type: 'text', text: 'Les'}],
                }, {
                    type: 'character', attrs: {id: 'b2'}, content: [{type: 'text', text: 'ANNA / PETR'}],
                },
            ],
        };

        const {changed} = migrateLegacyDocument(clean);

        expect(changed).toBe(false);
    });
});

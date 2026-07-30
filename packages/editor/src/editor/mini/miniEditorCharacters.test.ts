import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildMiniEditorCharacters} from './miniEditorCharacters';
import {createMiniEditorTestDocument} from './miniEditorTestUtils';

describe('buildMiniEditorCharacters', () => {
    it('derives the in-memory cast only from character blocks', () => {
        const document = createMiniEditorTestDocument();

        document.content?.[1]?.content?.unshift({
            type: 'text',
            text: 'BORIS',
            marks: [
                {
                    type: 'characterTag',
                    attrs: {
                        characterKey: 'BORIS',
                        characterId: null,
                    },
                },
            ],
        });
        document.content[2].content = [
            {
                type: 'text',
                text: 'ANNA / BORIS',
            },
        ];

        expect(buildMiniEditorCharacters(document)).toEqual([
            {
                id: 'mini-character:ANNA',
                key: 'ANNA',
                colorHex: null,
            }, {
                id: 'mini-character:BORIS',
                key: 'BORIS',
                colorHex: null,
            },
        ]);
    });
});

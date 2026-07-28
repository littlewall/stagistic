import {
    describe, expect, it,
} from 'vite-plus/test';

import {buildSuggestionRows} from './buildSuggestionRows';

const keys = (rows: ReturnType<typeof buildSuggestionRows>) => rows.map(([key]) => key);

describe('buildSuggestionRows', () => {
    it('shows all saved characters before typing', () => {
        const rows = buildSuggestionRows({
            counts: new Map([
                ['jan', 1],
                ['josef', 3],
                ['vaclav', 2],
            ]),
            activeKey: '',
            limit: 10,
        });

        expect(keys(rows)).toEqual([
            'josef',
            'vaclav',
            'jan',
        ]);
    });

    it('keeps only prefix matches while typing', () => {
        const jRows = buildSuggestionRows({
            counts: new Map([
                ['jan', 1],
                ['josef', 3],
                ['vaclav', 2],
            ]),
            activeKey: 'j',
            limit: 10,
        });
        const joRows = buildSuggestionRows({
            counts: new Map([
                ['jan', 1],
                ['josef', 3],
                ['vaclav', 2],
            ]),
            activeKey: 'jo',
            limit: 10,
        });

        expect(keys(jRows)).toEqual(['josef', 'jan']);
        expect(keys(joRows)).toEqual(['josef']);
    });

    it('closes the list when there is no prefix match', () => {
        const rows = buildSuggestionRows({
            counts: new Map([
                ['jan', 1],
                ['josef', 3],
                ['vaclav', 2],
            ]),
            activeKey: 'josefi',
            limit: 10,
        });

        expect(rows).toEqual([]);
    });

    it('does not suggest the exact active character', () => {
        const rows = buildSuggestionRows({
            counts: new Map([['jan', 1], ['josef', 3]]),
            activeKey: 'josef',
            limit: 10,
        });

        expect(keys(rows)).toEqual([]);
    });

    it('can include the exact active character when editing a tag', () => {
        const rows = buildSuggestionRows({
            counts: new Map([['jan', 1], ['josef', 3]]),
            activeKey: 'josef',
            includeActiveKey: true,
            limit: 10,
        });

        expect(keys(rows)).toEqual(['josef']);
    });
});

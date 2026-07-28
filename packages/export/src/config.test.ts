import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    BASIC_DEFAULTS,
    INTEGRATED_SCORE_DEFAULTS,
} from './config';

describe('BASIC_DEFAULTS', () => {
    it('starts with characters and places enabled and no manual blank pages', () => {
        expect(BASIC_DEFAULTS.characterFilter.mode).toBe('all');
        expect(BASIC_DEFAULTS.pageBreaks.sceneOnNewPage).toBe(true);
        expect(BASIC_DEFAULTS.pageBreaks.sceneOnOddPage).toBe(false);
        expect(BASIC_DEFAULTS.initialPages).toEqual({
            startEachInitialPageOnOddPage: true,
            showPageNumbers: true,
            charactersAndPlaces: {
                enabled: true,
                showPlaces: true,
                showCharacterOutlines: false,
                characterOrder: 'name',
            },
        });
        expect(BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript).toEqual({
            enabled: false,
            count: 1,
        });
    });
});

describe('INTEGRATED_SCORE_DEFAULTS', () => {
    it('inherits basic options and preserves full-script pagination by default', () => {
        expect(INTEGRATED_SCORE_DEFAULTS).toMatchObject(BASIC_DEFAULTS);
        expect(INTEGRATED_SCORE_DEFAULTS.characterFilter.preserveFullScriptPagination).toBe(true);
    });
});

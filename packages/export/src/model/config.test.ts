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
        expect(BASIC_DEFAULTS.showNotes).toBe(true);
        expect(BASIC_DEFAULTS.characterFilter.mode).toBe('all');
        expect(BASIC_DEFAULTS.pageBreaks.sceneOnNewPage).toBe(true);
        expect(BASIC_DEFAULTS.pageBreaks.sceneOnOddPage).toBe(false);
        expect(BASIC_DEFAULTS.initialPages).toEqual({
            startEachInitialPageOnOddPage: false,
            showPageNumbers: true,
            charactersAndPlaces: {
                enabled: true,
                showPlaces: true,
                showCharacterOutlines: false,
                characterOrder: 'name',
            },
            contents: {
                enabled: true,
                variant: 'scenes-and-musical-numbers',
            },
            vocalRanges: {
                enabled: true,
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
        expect(INTEGRATED_SCORE_DEFAULTS.showNotes).toBe(true);
        expect(INTEGRATED_SCORE_DEFAULTS.characterFilter.preserveFullScriptPagination).toBe(true);
    });
});

describe('INTEGRATED_SCORE_DEFAULTS contents', () => {
    it('clones the contents value instead of sharing it with Basic', () => {
        expect(INTEGRATED_SCORE_DEFAULTS.initialPages.contents).toEqual({
            enabled: true,
            variant: 'scenes-and-musical-numbers',
        });
        expect(INTEGRATED_SCORE_DEFAULTS.initialPages.contents)
            .not.toBe(BASIC_DEFAULTS.initialPages.contents);
    });
});

describe('vocalRanges defaults', () => {
    it('defaults vocal ranges on', () => {
        expect(BASIC_DEFAULTS.initialPages.vocalRanges).toEqual({enabled: true});
    });

    it('clones the vocalRanges value instead of sharing it with Basic', () => {
        expect(INTEGRATED_SCORE_DEFAULTS.initialPages.vocalRanges).toEqual({enabled: true});
        expect(INTEGRATED_SCORE_DEFAULTS.initialPages.vocalRanges)
            .not.toBe(BASIC_DEFAULTS.initialPages.vocalRanges);
    });
});

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {BASIC_DEFAULTS} from './config';

describe('BASIC_DEFAULTS', () => {
    it('starts without filtering or forced breaks', () => {
        expect(BASIC_DEFAULTS.characterFilter.mode).toBe('all');
        expect(BASIC_DEFAULTS.pageBreaks.sceneOnOddPage).toBe(false);
        expect(BASIC_DEFAULTS.blankPages.betweenTitleAndScript.count).toBe(0);
    });
});

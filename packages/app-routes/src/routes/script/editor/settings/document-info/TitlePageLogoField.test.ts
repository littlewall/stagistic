import {describe, expect, it} from 'vite-plus/test';

import {TITLE_PAGE_LOGO_MAX_BYTES, validateTitlePageLogoFile} from './TitlePageLogoField';

describe('validateTitlePageLogoFile', () => {
    it('accepts PNG and JPEG files up to 2 MB', () => {
        expect(validateTitlePageLogoFile({type: 'image/png', size: TITLE_PAGE_LOGO_MAX_BYTES})).toBeNull();
        expect(validateTitlePageLogoFile({type: 'image/jpeg', size: 1})).toBeNull();
    });

    it('rejects oversized and unsupported files', () => {
        expect(validateTitlePageLogoFile({type: 'image/png', size: TITLE_PAGE_LOGO_MAX_BYTES + 1})).toBe('The image must be 2 MB or smaller.');
        expect(validateTitlePageLogoFile({type: 'image/svg+xml', size: 100})).toBe('Choose a PNG or JPEG image.');
    });
});

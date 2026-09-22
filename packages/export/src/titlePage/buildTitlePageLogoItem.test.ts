import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {describe, expect, it} from 'vite-plus/test';

import {buildTitlePageLogoItem, TITLE_PAGE_LOGO_MAX_HEIGHT_PX, TITLE_PAGE_LOGO_MAX_WIDTH_PX} from './buildTitlePageLogoItem';

const logo = {
    dataUrl: 'data:image/png;base64,aGVsbG8=',
    filename: 'logo.png',
    mimeType: 'image/png' as const,
    widthPx: 1000,
    heightPx: 400,
    sizeBytes: 5,
};

describe('buildTitlePageLogoItem', () => {
    it('centers and scales a wide logo into the export bounds', () => {
        const item = buildTitlePageLogoItem({logo}, DEFAULT_EDITOR_SETTINGS);

        expect(item?.widthPx).toBe(TITLE_PAGE_LOGO_MAX_WIDTH_PX);
        expect(item?.heightPx).toBe(200);
        expect(item?.x).toBe((DEFAULT_EDITOR_SETTINGS.page.widthPx - TITLE_PAGE_LOGO_MAX_WIDTH_PX) / 2);
        expect(item?.format).toBe('PNG');
    });

    it('limits a tall logo by height while preserving its aspect ratio', () => {
        const item = buildTitlePageLogoItem(
            {
                logo: {
                    ...logo,
                    mimeType: 'image/jpeg',
                    widthPx: 400,
                    heightPx: 1000,
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(item?.heightPx).toBe(TITLE_PAGE_LOGO_MAX_HEIGHT_PX);
        expect(item?.widthPx).toBe(120);
        expect(item?.format).toBe('JPEG');
    });

    it('returns no item when the title page has no logo', () => {
        expect(buildTitlePageLogoItem({}, DEFAULT_EDITOR_SETTINGS)).toBeNull();
    });
});

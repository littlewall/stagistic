import type {EditorSettings, TitlePageSettings} from '@stagistic/script';

import type {TitlePageImageItem} from '../visualLine';

export const TITLE_PAGE_LOGO_MAX_WIDTH_PX = 500;
export const TITLE_PAGE_LOGO_MAX_HEIGHT_PX = 300;

const LOGO_TOP_RATIO = 0.055;

export const buildTitlePageLogoItem = (titlePage: TitlePageSettings | null, settings: EditorSettings): TitlePageImageItem | null => {
    const logo = titlePage?.logo;

    if (!logo || logo.widthPx <= 0 || logo.heightPx <= 0) {
        return null;
    }

    const contentWidthPx = settings.page.widthPx - settings.page.marginLeftPx - settings.page.marginRightPx;
    const maxWidthPx = Math.min(TITLE_PAGE_LOGO_MAX_WIDTH_PX, contentWidthPx);
    const scale = Math.min(1, maxWidthPx / logo.widthPx, TITLE_PAGE_LOGO_MAX_HEIGHT_PX / logo.heightPx);
    const widthPx = logo.widthPx * scale;
    const heightPx = logo.heightPx * scale;

    return {
        type: 'title-page-image',
        dataUrl: logo.dataUrl,
        format: logo.mimeType === 'image/png' ? 'PNG' : 'JPEG',
        x: (settings.page.widthPx - widthPx) / 2,
        y: settings.page.heightPx * LOGO_TOP_RATIO,
        widthPx,
        heightPx,
    };
};

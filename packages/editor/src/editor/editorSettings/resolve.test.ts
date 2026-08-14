import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {resolveEditorSettings} from './resolve';

describe('resolveEditorSettings', () => {
    it('keeps both horizontal page margins at least one inch wide', () => {
        const settings = resolveEditorSettings(undefined, {
            page: {
                marginLeftPx: 24,
                marginRightPx: 48,
            },
        });

        expect(settings.page.marginLeftPx).toBe(96);
        expect(settings.page.marginRightPx).toBe(96);
    });

    it('preserves one-inch margins when page width and requested margins conflict', () => {
        const settings = resolveEditorSettings(undefined, {
            page: {
                widthPx: 480,
                marginLeftPx: 1000,
                marginRightPx: 48,
            },
        });

        expect(settings.page.widthPx).toBe(512);
        expect(settings.page.marginLeftPx).toBe(96);
        expect(settings.page.marginRightPx).toBe(96);
    });
});

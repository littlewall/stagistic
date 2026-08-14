import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {getToolbarShortcutLabels} from './toolbarShortcutLabels';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('getToolbarShortcutLabels', () => {
    it('uses compact command glyphs on Apple platforms', () => {
        vi.stubGlobal('navigator', {platform: 'MacIntel', userAgent: ''});

        expect(getToolbarShortcutLabels()).toEqual({
            undo: '⌘Z',
            redo: '⇧⌘Z',
            bold: '⌘B',
            italic: '⌘I',
            underline: '⌘U',
        });
    });

    it('uses conventional Control labels on other platforms', () => {
        vi.stubGlobal('navigator', {platform: 'Win32', userAgent: 'Windows'});

        expect(getToolbarShortcutLabels()).toEqual({
            undo: 'Ctrl+Z',
            redo: 'Ctrl+Y',
            bold: 'Ctrl+B',
            italic: 'Ctrl+I',
            underline: 'Ctrl+U',
        });
    });
});

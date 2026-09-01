import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildEditorRootStyle} from './buildRootStyle';

const build = (
    isLeftSidebarOpen: boolean,
    isRightSidebarOpen: boolean,
) => buildEditorRootStyle({
    persistentCharacters: [],
    editorStyle: {},
    sidebarWidth: '280px',
    isLeftSidebarOpen,
    isRightSidebarOpen,
}) as Record<string, string>;

describe('buildEditorRootStyle', () => {
    it('defers to the canonical panel width token by default', () => {
        const style = buildEditorRootStyle({
            persistentCharacters: [],
            editorStyle: {},
            isLeftSidebarOpen: false,
            isRightSidebarOpen: false,
        }) as Record<string, string>;

        expect(style['--editor-sidebar-width']).toBe('var(--sidebar-width)');
    });

    it('does not reserve content width for a closed sidebar', () => {
        const style = build(true, false);

        expect(style['--left-sidebar-size']).toBe('var(--editor-sidebar-width)');
        expect(style['--right-sidebar-size']).toBe('0px');
        expect(style['--right-toolbar-size']).toBeUndefined();
    });

    it('lets the canvas use the full content width when both sidebars are closed', () => {
        const style = build(false, false);

        expect(style['--left-sidebar-size']).toBe('0px');
        expect(style['--right-sidebar-size']).toBe('0px');
    });
});

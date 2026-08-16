import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    getSidebarViewportMode,
    SIDEBAR_EXCLUSIVE_QUERY,
    SIDEBAR_OVERLAY_QUERY,
} from './sidebarViewport';

describe('getSidebarViewportMode', () => {
    it.each([
        [1199, {isExclusive: true, isOverlay: true}],
        [1200, {isExclusive: false, isOverlay: false}],
        [1440, {isExclusive: false, isOverlay: false}],
    ])('resolves the sidebar contract at %d px', (width, expected) => {
        expect(getSidebarViewportMode(width)).toEqual(expected);
    });

    /*
     * The hook reads these queries while `Editor.module.css` hardcodes the same
     * pixel values, so a drift here would leave the layout and the state
     * machine disagreeing about whether a sidebar is docked or floating.
     */
    it('exposes media queries matching the breakpoints', () => {
        expect(SIDEBAR_EXCLUSIVE_QUERY).toBe('(max-width: 1199px)');
        expect(SIDEBAR_OVERLAY_QUERY).toBe('(max-width: 1199px)');
    });
});

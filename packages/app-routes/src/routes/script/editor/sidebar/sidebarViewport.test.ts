import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {getSidebarViewportMode} from './sidebarViewport';

describe('getSidebarViewportMode', () => {
    it.each([
        [1199, {isExclusive: true, isOverlay: true}],
        [1200, {isExclusive: true, isOverlay: false}],
        [1469, {isExclusive: true, isOverlay: false}],
        [1470, {isExclusive: false, isOverlay: false}],
    ])('resolves the sidebar contract at %d px', (width, expected) => {
        expect(getSidebarViewportMode(width)).toEqual(expected);
    });
});

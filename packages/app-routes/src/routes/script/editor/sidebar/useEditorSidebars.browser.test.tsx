import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';

import type {SidebarPanel} from './types';
import {useEditorSidebars} from './useEditorSidebars';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];
let mountCount = 0;

const panels: readonly SidebarPanel[] = [
    {id: 'structure', label: 'Structure', renderContent: () => null},
    {id: 'characters', label: 'Characters', renderContent: () => null},
    {id: 'comments', label: 'Comments', renderContent: () => null},
];

type Sidebars = ReturnType<typeof useEditorSidebars>;

const mount = () => {
    const captured: {current: Sidebars | null} = {current: null};
    const storageScope = `reveal-${++mountCount}-${Date.now()}`;
    const Probe = () => {
        captured.current = useEditorSidebars({
            panels,
            defaultLeftPanelId: 'structure',
            defaultRightPanelId: 'characters',
            storageScope,
        });

        return null;
    };
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    act(() => root.render(<Probe />));
    roots.push(root);

    return captured as {current: Sidebars};
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
});

describe('useEditorSidebars.revealPanel', () => {
    it('selects the panel on the right and opens it when neither side shows it', () => {
        const sidebars = mount();

        act(() => sidebars.current.rightSidebarToggle.onToggle());
        expect(sidebars.current.rightSidebarToggle.isOpen).toBe(false);

        act(() => sidebars.current.revealPanel('comments'));

        expect(sidebars.current.rightSidebarToggle.label).toBe('Comments');
        expect(sidebars.current.rightSidebarToggle.isOpen).toBe(true);
        expect(sidebars.current.isPanelOpen('comments')).toBe(true);
    });

    it('opens the left side when the panel already lives there', () => {
        const sidebars = mount();

        act(() => sidebars.current.leftSidebarToggle.onToggle());
        expect(sidebars.current.leftSidebarToggle.isOpen).toBe(false);

        act(() => sidebars.current.revealPanel('structure'));

        expect(sidebars.current.leftSidebarToggle.isOpen).toBe(true);
        expect(sidebars.current.rightSidebarToggle.label).toBe('Characters');
    });

    it('reports a panel that is not shown as closed', () => {
        const sidebars = mount();

        expect(sidebars.current.isPanelOpen('comments')).toBe(false);
    });
});

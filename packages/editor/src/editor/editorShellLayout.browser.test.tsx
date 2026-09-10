import '@stagistic/ui/styles/base.css';

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {buildEditorRootStyle} from './buildRootStyle';
import styles from './Editor.module.css';

/*
 * Both breakpoints come from the `@media (max-width: 1199px)` blocks in
 * `Editor.module.css`, where the sidebars stop being grid tracks and float over
 * the canvas as drawers.
 */
const OVERLAY_WIDTH = 1100;
const DOCKED_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;

const applyRootStyle = (element: HTMLElement, isRightSidebarOpen: boolean) => {
    const variables = buildEditorRootStyle({
        persistentCharacters: [],
        editorStyle: {},
        isLeftSidebarOpen: false,
        isRightSidebarOpen,
    }) as Record<string, string>;

    Object.entries(variables).forEach(([name, value]) => {
        element.style.setProperty(name, value);
    });
};

/**
 * Rebuilds the shell's box structure from `EditorShell` with the real style
 * sheet, so the assertions below measure the CSS contract rather than a mock.
 */
const mountShell = ({isRightSidebarOpen}: {isRightSidebarOpen: boolean}) => {
    const root = document.createElement('div');

    root.className = styles.root;
    root.style.height = `${VIEWPORT_HEIGHT}px`;
    applyRootStyle(root, isRightSidebarOpen);

    root.innerHTML = `
        <div class="${styles.shellBody}">
            <div class="${styles.sidebarScrim} ${isRightSidebarOpen ? styles.sidebarScrimVisible : ''}" data-testid="sidebar-scrim"></div>
            <aside class="${styles.sidebarLeft} ${styles.sidebarHidden}"></aside>
            <main class="${styles.editorMain}" data-testid="editor-main">
                <div class="${styles.toolbarRow}">
                    <button class="${styles.sidebarToggleButton} ${styles.toolbarToggleStart}"></button>
                    <div class="${styles.toolbarCenterInner}" data-testid="toolbar-content">toolbar</div>
                    <button class="${styles.sidebarToggleButton} ${styles.toolbarToggleEnd}"></button>
                </div>
                <div class="${styles.canvasHost}">
                    <div data-testid="page" style="width: var(--editor-page-width); height: 60px;"></div>
                    <div data-testid="music-cue" style="position: relative; z-index: 20; width: 100%; height: 24px; margin-top: 120px;"></div>
                </div>
            </main>
            <aside
                class="${styles.sidebarRight} ${isRightSidebarOpen ? styles.sidebarOpen : styles.sidebarHidden}"
                data-testid="right-sidebar"
            >
                <div data-testid="right-header" style="height: 40px;">header</div>
                <div style="flex: 1;">content</div>
            </aside>
        </div>
    `;

    document.body.appendChild(root);

    return root;
};

const getRect = (testId: string) => {
    const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

    if (!element) {
        throw new Error(`Expected an element with data-testid="${testId}"`);
    }

    return element.getBoundingClientRect();
};

afterEach(async () => {
    document.body.innerHTML = '';
    await page.viewport(DOCKED_WIDTH, VIEWPORT_HEIGHT);
});

describe('editor shell layout below the overlay breakpoint', () => {
    it('keeps the drawer header and content in one full-height overlay', async () => {
        await page.viewport(OVERLAY_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const sidebar = getRect('right-sidebar');
        const header = getRect('right-header');

        expect(sidebar.width).toBeCloseTo(256, 0);
        expect(sidebar.height).toBeCloseTo(VIEWPORT_HEIGHT, 0);
        expect(header.width).toBeCloseTo(sidebar.width - 1, 0);
    });

    it('does not reserve canvas width for an overlay drawer', async () => {
        await page.viewport(OVERLAY_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const editorMain = getRect('editor-main');

        expect(editorMain.width).toBeCloseTo(OVERLAY_WIDTH, 0);
    });

    it('keeps canvas overlays underneath the open drawer', async () => {
        await page.viewport(OVERLAY_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const sidebar = getRect('right-sidebar');
        const cue = getRect('music-cue');
        const probeX = sidebar.left + (sidebar.width / 2);
        const probeY = cue.top + (cue.height / 2);

        expect(cue.right).toBeGreaterThan(sidebar.left);

        const topElement = document.elementFromPoint(probeX, probeY);

        expect(topElement?.closest(`.${styles.sidebarRight}`)).not.toBeNull();
    });

    it('places a scrim above the canvas and below the drawer', async () => {
        await page.viewport(OVERLAY_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const scrim = getRect('sidebar-scrim');
        const topElement = document.elementFromPoint(100, scrim.top + 100);

        expect(topElement?.closest(`.${styles.sidebarScrim}`)).not.toBeNull();
    });

    /*
     * Bold, italic and the block selector change the page, so they have to look
     * attached to it. Stretched across the shell they ended up nowhere near the
     * text once both panels were closed.
     */
    it('keeps the formatting controls on the page column, not the shell width', async () => {
        await page.viewport(DOCKED_WIDTH, VIEWPORT_HEIGHT);

        const root = mountShell({isRightSidebarOpen: false});

        root.style.setProperty('--editor-page-width', '600px');

        const toolbarContent = getRect('toolbar-content');
        const pageRect = getRect('page');

        expect(toolbarContent.width).toBeCloseTo(600, 0);
        expect(toolbarContent.left).toBeCloseTo(pageRect.left, 0);
        expect(toolbarContent.right).toBeCloseTo(pageRect.right, 0);
    });

    it('still lays the sidebar out as a grid track above the breakpoint', async () => {
        await page.viewport(DOCKED_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const editorMain = getRect('editor-main');
        const sidebar = getRect('right-sidebar');

        expect(sidebar.width).toBeCloseTo(256, 0);
        expect(editorMain.right).toBeLessThanOrEqual(sidebar.left + 1);
    });
});

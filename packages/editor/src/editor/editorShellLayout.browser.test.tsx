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
        <div class="${styles.toolbarRow}">
            <div class="${styles.toolbarSide} ${styles.toolbarSideLeft}"></div>
            <div class="${styles.toolbarCenter}">
                <div class="${styles.toolbarCenterInner}">toolbar</div>
            </div>
            <div class="${styles.toolbarSide} ${styles.toolbarSideRight}" data-testid="right-toolbar-side">
                <div data-testid="right-header" style="flex: 1; min-width: 0;">header</div>
            </div>
        </div>
        <div class="${styles.contentRow}">
            <aside class="${styles.sidebarLeft} ${styles.sidebarHidden}"></aside>
            <div class="${styles.canvasHost}">
                <div data-testid="music-cue" style="position: relative; z-index: 20; width: 100%; height: 24px; margin-top: 120px;"></div>
            </div>
            <aside
                class="${styles.sidebarRight} ${isRightSidebarOpen ? styles.sidebarOpen : styles.sidebarHidden}"
                data-testid="right-sidebar"
            ></aside>
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
    it('gives the open sidebar toolbar the full sidebar width', async () => {
        await page.viewport(OVERLAY_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const toolbarSide = getRect('right-toolbar-side');
        const sidebar = getRect('right-sidebar');

        /*
         * Regression guard: the toolbar row used to be pinned to the toggle rail
         * here, which clipped the panel select and left the drawer stuck on
         * whichever panel it opened with.
         */
        expect(toolbarSide.width).toBeCloseTo(sidebar.width, 0);
        expect(getRect('right-header').width).toBeGreaterThan(0);
    });

    it('keeps the closed sidebar toolbar down at the toggle rail', async () => {
        await page.viewport(OVERLAY_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: false});

        const toolbarSide = getRect('right-toolbar-side');

        expect(toolbarSide.width).toBeLessThan(100);
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

    it('still lays the sidebar out as a grid track above the breakpoint', async () => {
        await page.viewport(DOCKED_WIDTH, VIEWPORT_HEIGHT);
        mountShell({isRightSidebarOpen: true});

        const canvasHost = document.querySelector<HTMLElement>(`.${styles.canvasHost}`)!;
        const sidebar = getRect('right-sidebar');

        expect(canvasHost.getBoundingClientRect().right).toBeLessThanOrEqual(sidebar.left + 1);
    });
});

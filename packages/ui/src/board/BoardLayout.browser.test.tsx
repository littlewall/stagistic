import '../../styles/base.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {AppHeader} from '../layout/AppHeader';
import {BoardLayout} from './BoardLayout';
import {
    BoardMatrix,
    type BoardMatrixAct,
    type BoardMatrixRow,
} from './BoardMatrix';

let root: Root | null = null;

const waitFor = async <T,>(read: () => T | null | undefined | false): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) return value;

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

const ACTS: BoardMatrixAct[] = [
    {
        key: 'a1',
        name: 'ACT ONE',
        scenes: [
            {
                headingBlockId: 's1',
                number: 1,
                title: 'Kitchen',
                page: null,
            },
            {
                headingBlockId: 's2',
                number: 2,
                title: 'Garden',
                page: null,
            },
        ],
    },
];

const ROWS: BoardMatrixRow[] = [
    {
        id: 'c-anna',
        characterId: 'c-anna',
        name: 'ANNA',
        color: '#cc3344',
        sceneCount: 1,
        cells: [
            {
                kind: 'script',
                chip: {
                    id: 'c-anna',
                    characterId: 'c-anna',
                    name: 'ANNA',
                    color: '#cc3344',
                    source: 'script',
                    note: null,
                    isDimmed: false,
                },
            },
            {kind: 'empty', chip: null},
        ],
    },
];

/* The Board page: the header above the Board layout, both inside one fixed-width host. */
const mountBoardPage = (hostWidth: number) => {
    const host = document.createElement('div');

    host.style.width = `${hostWidth}px`;
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '600px',
            }}
        >
            <AppHeader
                onHome={() => {}}
                width="board"
                scriptActions={<span data-header-right>Actions</span>}
            />
            <BoardLayout
                toolbar={(
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <span data-toolbar-left>Tabs</span>
                        <span data-toolbar-right>Filter</span>
                    </div>
                )}
            >
                <div data-canvas-child>Canvas</div>
            </BoardLayout>
        </div>,
    );

    return host;
};

const mountLayoutWithMatrix = (hostWidth: number) => {
    const host = document.createElement('div');

    host.style.width = `${hostWidth}px`;
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '400px',
            }}
        >
            <BoardLayout toolbar={<div data-toolbar>Tabs and filter</div>}>
                <BoardMatrix acts={ACTS} rows={ROWS} />
            </BoardLayout>
        </div>,
    );

    return host;
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const spread = (values: number[]) => Math.max(...values) - Math.min(...values);

describe('BoardLayout', () => {
    it('puts the header, the toolbar and the canvas in one centered Board column', async () => {
        mountBoardPage(2200);

        const home = await waitFor(() => document.querySelector<HTMLElement>('button[aria-label="Go to home"]'));
        const headerRight = requireValue(document.querySelector<HTMLElement>('[data-header-right]'), 'header right');
        const toolbarLeft = requireValue(document.querySelector<HTMLElement>('[data-toolbar-left]'), 'toolbar left');
        const toolbarRight = requireValue(document.querySelector<HTMLElement>('[data-toolbar-right]'), 'toolbar right');
        const canvasChild = requireValue(document.querySelector<HTMLElement>('[data-canvas-child]'), 'canvas child');

        /* The home icon, the toolbar's tabs and the canvas content share a left edge. */
        expect(spread([
            home,
            toolbarLeft,
            canvasChild,
        ].map(item => item.getBoundingClientRect().left))).toBeLessThanOrEqual(1);

        /* So do the header's actions, the filter and the canvas content on the right. */
        expect(spread([
            headerRight,
            toolbarRight,
            canvasChild,
        ].map(item => item.getBoundingClientRect().right))).toBeLessThanOrEqual(1);

        /* The column stays between the homepage width and the full-width Editor. */
        expect(canvasChild.getBoundingClientRect().width).toBeLessThanOrEqual(1680);
        expect(canvasChild.getBoundingClientRect().width).toBeGreaterThan(1400);
    });

    it('fills narrow viewports without horizontal overflow; the Matrix scrolls inside the column', async () => {
        for (const hostWidth of [1000, 1280]) {
            root?.unmount();
            document.body.innerHTML = '';

            const host = mountLayoutWithMatrix(hostWidth);

            await waitFor(() => document.querySelector('[role="grid"]'));

            /* Nothing spills past the viewport, at the app minimum or a common laptop. */
            expect(host.scrollWidth).toBeLessThanOrEqual(host.clientWidth + 1);

            const grid = requireValue(document.querySelector<HTMLElement>('[role="grid"]'), 'grid');
            const matrixScroll = requireValue(grid.parentElement, 'matrix scroll container');

            /* The Matrix keeps its own scroll element and stays inside the column. */
            expect(getComputedStyle(matrixScroll).overflow).toContain('auto');
            expect(matrixScroll.scrollWidth).toBeLessThanOrEqual(matrixScroll.clientWidth + 1);
            expect(grid.getBoundingClientRect().width).toBeLessThanOrEqual(1680);
        }
    });
});

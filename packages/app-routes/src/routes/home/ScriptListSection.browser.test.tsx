import '@stagistic/ui/styles/base.css';

import type {ScriptSummary} from '@stagistic/app-core';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {ScriptListSection} from './ScriptListSection';

const roots: Root[] = [];
const script = {
    id: 'stored-script',
    title: 'Stored draft',
    subtitle: 'A play in two acts',
    activeBlockId: null,
    createdAt: 1,
    updatedAt: 2,
    summaryMetadata: {
        pageCount: 42,
        sceneCount: 8,
        actSceneCounts: [2, 6],
        unassignedSceneCount: 0,
    },
};

const mountScripts = async (scripts: ScriptSummary[]) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const actions = {
        onOpenScript: vi.fn(),
        onRenameScript: vi.fn(),
        onDuplicateScript: vi.fn(),
        onDeleteScript: vi.fn(),
    };

    document.body.appendChild(host);
    roots.push(root);
    root.render(<ScriptListSection scripts={scripts} {...actions} />);

    await expect.poll(() => host.textContent).toContain(scripts[0]?.title);

    return actions;
};

const findButton = (label: string) => {
    return Array.from(document.querySelectorAll('button'))
        .find(button => button.textContent?.trim() === label);
};

afterEach(async () => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    await page.viewport(1280, 800);
});

describe('ScriptListSection cards', () => {
    it('opens the same script from the card body and footer button', async () => {
        const actions = await mountScripts([script]);
        const card = document.querySelector('article');

        expect(card).toBeTruthy();

        const body = card?.querySelector('[aria-label="Script structure"]') as HTMLElement;
        const editorButton = findButton('Go to editor') as HTMLButtonElement;
        const title = findButton('Stored draft') as HTMLButtonElement;
        const bodyRect = body.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        const point = {x: bodyRect.left + bodyRect.width / 2, y: bodyRect.top + bodyRect.height / 2};

        expect(document.elementFromPoint(point.x, point.y)).toBe(title);
        await page.elementLocator(title).click({
            position: {x: point.x - titleRect.left, y: point.y - titleRect.top},
        });
        await userEvent.click(editorButton);

        expect(actions.onOpenScript.mock.calls).toEqual([
            ['stored-script'],
            ['stored-script'],
        ]);
        expect(card?.querySelector('button button')).toBeNull();
    });

    it('opens from the title with the keyboard', async () => {
        const actions = await mountScripts([script]);
        const title = findButton('Stored draft') as HTMLButtonElement;

        expect(title).toBeTruthy();
        title.focus();
        await userEvent.keyboard('{Enter}');

        expect(actions.onOpenScript).toHaveBeenCalledWith('stored-script');
    });

    it.each([
        ['Rename script', 'onRenameScript'],
        ['Duplicate script', 'onDuplicateScript'],
        ['Delete script', 'onDeleteScript'],
    ] as const)('keeps %s independent from opening the script', async (label, action) => {
        const actions = await mountScripts([script]);

        await userEvent.click(document.querySelector('[aria-label="Open actions for Stored draft"]') as HTMLButtonElement);
        await expect.poll(() => document.querySelector('[role="menu"]')).toBeTruthy();
        await userEvent.click(Array.from(document.querySelectorAll('[role="menuitem"]'))
            .find(item => item.textContent?.includes(label)) as HTMLElement);

        expect(actions[action]).toHaveBeenCalledWith(script);
        expect(actions.onOpenScript).not.toHaveBeenCalled();
    });

    it('renders the proportional act distribution without a page count', async () => {
        await mountScripts([script]);

        expect(document.body.textContent).not.toMatch(/\bpages?\b/);
        expect(document.body.textContent).toContain('Act I · 2 scenes');
        expect(document.body.textContent).toContain('Act II · 6 scenes');

        const bars = document.querySelectorAll<HTMLElement>('[aria-label="Script structure"] [aria-hidden="true"]');
        const widths = Array.from(bars).map(bar => bar.getBoundingClientRect().width);

        expect(widths).toHaveLength(2);
        expect((widths[1] ?? 0) / (widths[0] ?? 1)).toBeCloseTo(3, 1);
    });

    it.each([0, 3])('keeps a line and %s scenes for a script without acts', async sceneCount => {
        await mountScripts([
            {
                ...script,
                summaryMetadata: {
                    pageCount: null,
                    sceneCount,
                    actSceneCounts: [],
                    unassignedSceneCount: sceneCount,
                },
            },
        ]);

        const structure = document.querySelector('[aria-label="Script structure"]');

        expect(structure?.textContent).toBe(`${sceneCount} scenes`);
        expect(structure?.querySelector('[aria-hidden="true"]')?.getBoundingClientRect().width)
            .toBeGreaterThan(0);
        expect(structure?.textContent).not.toContain('Act I');
    });

    it.each([null, undefined])('shows unknown counts for legacy summaries with %s metadata', async summaryMetadata => {
        await mountScripts([
            {
                ...script,
                summaryMetadata,
            },
        ]);

        expect(document.querySelector('[aria-label="Script structure"]')?.textContent).toBe('— scenes');
    });

    it('keeps empty acts and scenes before the first act visible', async () => {
        await mountScripts([
            {
                ...script,
                summaryMetadata: {
                    pageCount: 1,
                    sceneCount: 3,
                    actSceneCounts: [0, 1],
                    unassignedSceneCount: 2,
                },
            },
        ]);

        expect(document.body.textContent).toContain('Before Act I · 2 scenes');
        expect(document.body.textContent).toContain('Act I · 0 scenes');
        expect(document.body.textContent).toContain('Act II · 1 scene');
    });

    it.each([
        [1280, 2],
        [1000, 2],
        [390, 1],
    ])('uses %s px viewport for %s card columns', async (width, columns) => {
        await page.viewport(width, 800);
        await mountScripts([
            script,
            {
                ...script,
                id: 'second-script',
                title: 'Second draft',
            },
        ]);

        const grid = document.querySelector('[aria-label="Scripts"] > div') as HTMLElement;

        expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(columns);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    });

    it.each(['light', 'dark'])('keeps long titles and many acts inside neutral card borders in %s mode', async theme => {
        document.documentElement.setAttribute('data-theme', theme);
        await page.viewport(390, 800);
        await mountScripts([
            {
                ...script,
                title: 'An unusually long title that still belongs in a compact script card',
                subtitle: 'A subtitle that keeps every word visible while the card narrows',
                summaryMetadata: {
                    pageCount: 0,
                    sceneCount: 12,
                    actSceneCounts: Array.from({length: 12}, () => 1),
                    unassignedSceneCount: 0,
                },
            },
        ]);

        const card = document.querySelector('article') as HTMLElement;
        const header = card.querySelector('header') as HTMLElement;
        const probe = document.createElement('div');

        probe.style.border = '1px solid var(--color-border-subtle)';
        document.body.appendChild(probe);

        expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
        expect(card.textContent).toContain('Act XII · 1 scene');
        expect(getComputedStyle(header).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(header).borderBottomStyle).toBe('solid');
        expect(getComputedStyle(card.querySelector('footer') as HTMLElement).borderTopStyle).toBe('none');
        expect(getComputedStyle(card).borderTopColor).toBe(getComputedStyle(probe).borderTopColor);
        expect(card.querySelector('h2')?.scrollHeight).toBe(card.querySelector('h2')?.clientHeight);
    });
});

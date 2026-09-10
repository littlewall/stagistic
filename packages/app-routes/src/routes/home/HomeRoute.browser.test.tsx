import '@stagistic/ui/styles/base.css';

import type {ScriptSummary} from '@stagistic/app-core';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {createExampleScript} from './example-script/createExampleScript';
import {HomeRoute} from './HomeRoute';

const {
    headerProps,
    modalActions,
    scriptsState,
    scriptActions,
} = vi.hoisted(() => ({
    headerProps: {
        showScriptActions: null as boolean | null,
    },
    modalActions: {
        openNewScript: vi.fn(),
        openImportScript: vi.fn(),
        openDeleteScript: vi.fn(),
        openRenameScript: vi.fn(),
        openDuplicateScript: vi.fn(),
    },
    scriptsState: {
        summaries: [] as ScriptSummary[],
    },
    scriptActions: {
        createScript: vi.fn(),
        deleteScript: vi.fn(),
    },
}));

vi.mock('@stagistic/app-core', async importOriginal => {
    const original = await importOriginal<typeof import('@stagistic/app-core')>();

    return {
        ...original,
        useScripts: () => ({
            scriptSummaries: scriptsState.summaries,
            isLoading: false,
            error: null,
            refreshScripts: vi.fn(),
            ...scriptActions,
        }),
        useScriptRepository: () => ({}),
    };
});

vi.mock('./example-script/createExampleScript', () => ({
    createExampleScript: vi.fn(),
}));

vi.mock('../../global-modals/GlobalModalsProvider', () => ({
    useGlobalModals: () => modalActions,
}));

vi.mock('../../layout/AppHeader', () => ({
    AppHeader: ({showScriptActions}: {showScriptActions?: boolean}) => {
        headerProps.showScriptActions = showScriptActions ?? true;

        return <div data-testid="app-header" />;
    },
}));

const roots: Root[] = [];

const mountHome = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);

    const render = () => root.render(<MemoryRouter><HomeRoute /></MemoryRouter>);

    render();
    roots.push(root);

    return render;
};

const waitForText = async (text: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (document.body.textContent?.includes(text)) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for "${text}"`);
};

const findButton = (label: string) => {
    return Array.from(document.querySelectorAll('button'))
        .find(button => button.textContent?.includes(label));
};

const scriptSummary = (id: string, title: string, updatedAt: number): ScriptSummary => ({
    id,
    title,
    subtitle: null,
    activeBlockId: null,
    createdAt: updatedAt,
    updatedAt,
});

const fiveScripts = [
    scriptSummary('script-1', 'One draft', 1),
    scriptSummary('script-2', 'Two draft', 2),
    scriptSummary('script-3', 'Three draft', 3),
    scriptSummary('script-4', 'Four draft', 4),
    scriptSummary('script-5', 'Five draft', 5),
];

const expectSubtlePrimaryAction = async (
    primary: HTMLButtonElement,
    secondary: HTMLButtonElement,
) => {
    await userEvent.hover(document.querySelector('h1') as HTMLHeadingElement);
    await new Promise(resolve => window.setTimeout(resolve, 200));

    const primaryIcon = primary.querySelector('svg')?.parentElement;
    const secondaryIcon = secondary.querySelector('svg')?.parentElement;

    expect(getComputedStyle(primary).backgroundColor)
        .toBe(getComputedStyle(secondary).backgroundColor);
    expect(getComputedStyle(primary).color)
        .toBe(getComputedStyle(secondary).color);
    expect(getComputedStyle(primary).borderTopColor)
        .not.toBe(getComputedStyle(secondary).borderTopColor);
    expect(getComputedStyle(primaryIcon as HTMLElement).backgroundColor)
        .not.toBe(getComputedStyle(secondaryIcon as HTMLElement).backgroundColor);
};

/* Hover transitions run for 150ms, so styles are read once they settle. */
const settle = async () => {
    await new Promise(resolve => window.setTimeout(resolve, 250));
};

const unhover = async () => {
    await userEvent.hover(document.querySelector('h1') as HTMLHeadingElement);
    await settle();
};

/* Resolves a token the way the browser will, without restating its value here. */
const resolveShadow = (token: string) => {
    const probe = document.createElement('div');

    probe.style.boxShadow = `var(${token})`;
    document.body.appendChild(probe);

    const resolved = getComputedStyle(probe).boxShadow;

    probe.remove();

    return resolved;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    scriptsState.summaries = [];
    headerProps.showScriptActions = null;
    Object.values(modalActions).forEach(action => action.mockReset());
    Object.values(scriptActions).forEach(action => action.mockReset());
    vi.mocked(createExampleScript).mockReset();
});

describe('HomeRoute', () => {
    it('uses three start cards as the empty-state actions', async () => {
        mountHome();
        await waitForText('No scripts yet.');

        const newScript = findButton('New script');
        const importScript = findButton('Import script');
        const exampleScript = findButton('Create example script');

        expect(newScript).toBeTruthy();
        expect(importScript).toBeTruthy();
        expect(exampleScript?.disabled).toBe(false);
        expect(document.querySelector('[role="group"][aria-label="Start a script"]')).toBeTruthy();
        expect(document.querySelector('input[type="search"]')).toBeNull();
        expect(headerProps.showScriptActions).toBe(false);

        vi.mocked(createExampleScript).mockResolvedValue({
            scriptId: 'example-script',
            title: 'Example musical',
        });

        await userEvent.click(newScript as HTMLButtonElement);
        await userEvent.click(importScript as HTMLButtonElement);
        await userEvent.click(exampleScript as HTMLButtonElement);

        expect(modalActions.openNewScript).toHaveBeenCalledTimes(1);
        expect(modalActions.openImportScript).toHaveBeenCalledTimes(1);
        await expect.poll(() => vi.mocked(createExampleScript).mock.calls).toHaveLength(1);
    });

    it('prioritizes the example action in an empty library', async () => {
        mountHome();
        await waitForText('No scripts yet.');

        const newScript = findButton('New script');
        const exampleScript = findButton('Create example script');

        await expectSubtlePrimaryAction(
            exampleScript as HTMLButtonElement,
            newScript as HTMLButtonElement,
        );
    });

    it('replaces the home page with a full-page loader while creating an example script', async () => {
        vi.mocked(createExampleScript).mockImplementation(() => new Promise(() => {}));

        mountHome();
        await waitForText('No scripts yet.');

        await userEvent.click(findButton('Create example script') as HTMLButtonElement);

        await expect.poll(() => document.querySelector('[role="status"]')).toBeTruthy();

        const progressBar = document.querySelector('[role="progressbar"]');

        expect(progressBar?.getAttribute('aria-label')).toBe('Preparing example script');
        expect(document.body.textContent).toContain('Creating script and loading attachments');
        expect(findButton('New script')).toBeUndefined();
        expect(document.querySelector('[data-testid="app-header"]')).toBeNull();
    });

    it('shows one script once without unnecessary library tools', async () => {
        scriptsState.summaries = [scriptSummary('script-1', 'One draft', 2)];

        mountHome();
        await waitForText('One draft');

        const scriptButtons = Array.from(document.querySelectorAll('button'))
            .filter(button => button.textContent?.includes('One draft'));

        expect(scriptButtons).toHaveLength(1);
        expect(document.querySelector('input[type="search"]')).toBeNull();
        expect(document.querySelector('[aria-label="Sort scripts"]')).toBeNull();
        expect(document.body.textContent).not.toContain('Continue writing');
        expect(document.body.textContent).not.toContain('Recently edited');
        expect(document.body.textContent).not.toContain('All scripts');
    });

    it('shows library tools for five scripts', async () => {
        scriptsState.summaries = fiveScripts;

        mountHome();
        await waitForText('Five draft');

        expect(document.querySelector('input[type="search"]')).toBeTruthy();
        expect(document.querySelector('[aria-label="Sort scripts"]')).toBeTruthy();
    });

    it('ignores hidden library tools when the library shrinks below five scripts', async () => {
        scriptsState.summaries = fiveScripts;

        const rerender = mountHome();

        await waitForText('Five draft');

        await userEvent.click(document.querySelector('[aria-label="Sort scripts"]') as HTMLButtonElement);
        await userEvent.click(findButton('Title A–Z') as HTMLButtonElement);
        await userEvent.type(
            document.querySelector('input[type="search"]') as HTMLInputElement,
            'No match',
        );
        await waitForText('No scripts match');

        scriptsState.summaries = fiveScripts.slice(0, 4);
        rerender();

        await waitForText('Four draft');
        expect(document.querySelector('input[type="search"]')).toBeNull();
        expect(Array.from(document.querySelectorAll('[aria-label="Scripts"] button'))
            .filter(button => button.textContent?.includes('draft'))
            .map(button => fiveScripts.find(script => button.textContent?.includes(script.title))?.title))
            .toEqual([
                'Four draft',
                'Three draft',
                'Two draft',
                'One draft',
            ]);
    });

    it('prioritizes a new script and removes the example action from a populated library', async () => {
        scriptsState.summaries = [scriptSummary('script-1', 'One draft', 2)];

        mountHome();
        await waitForText('One draft');

        const newScript = findButton('New script');
        const importScript = findButton('Import script');
        const startActions = document.querySelector<HTMLElement>(
            '[role="group"][aria-label="Start a script"]',
        );

        expect(findButton('Create example script')).toBeUndefined();
        expect(getComputedStyle(startActions as HTMLElement).gridTemplateColumns.split(' '))
            .toHaveLength(2);
        await expectSubtlePrimaryAction(
            newScript as HTMLButtonElement,
            importScript as HTMLButtonElement,
        );
    });
});

describe('HomeRoute hover states', () => {
    /*
     * Hovering a start card used to wash it in `--color-surface-raised` and drop
     * `--shadow-card` — a 20px-blur cloud under a 160px card. Both mechanics read
     * as a heavier, older UI than the rest of the page, so hover now carries the
     * edge and a 1px lift instead of tone and depth.
     */
    it('answers a start-card hover through its edge, not a fill or a drop shadow', async () => {
        scriptsState.summaries = [scriptSummary('script-1', 'One draft', 2)];

        mountHome();
        await waitForText('One draft');

        const card = findButton('Import script') as HTMLButtonElement;

        await unhover();

        const resting = getComputedStyle(card);
        const restingBackground = resting.backgroundColor;
        const restingBorder = resting.borderTopColor;

        await userEvent.hover(card);
        await settle();

        const hovered = getComputedStyle(card);

        expect(hovered.backgroundColor).toBe(restingBackground);
        expect(hovered.borderTopColor).not.toBe(restingBorder);
        expect(hovered.boxShadow).not.toBe(resolveShadow('--shadow-card'));
        expect(hovered.boxShadow).not.toBe('none');
        expect(hovered.transform).not.toBe('none');
    });

    /*
     * A row has no edge to carry the state, so tone stays — but at a fraction of
     * the old full-strength `--color-surface-raised` wash.
     */
    it('keeps a row hover well under a full surface-raised wash', async () => {
        scriptsState.summaries = [scriptSummary('script-1', 'One draft', 2)];

        mountHome();
        await waitForText('One draft');

        const row = document.querySelector<HTMLElement>('[aria-label="Scripts"] button')
            ?.closest('[class*="scriptRow"]') as HTMLElement;

        await unhover();

        const restingBackground = getComputedStyle(row).backgroundColor;

        await userEvent.hover(row);
        await settle();

        const hoveredBackground = getComputedStyle(row).backgroundColor;
        const probe = document.createElement('div');

        probe.style.backgroundColor = 'var(--color-surface-raised)';
        document.body.appendChild(probe);

        const fullWash = getComputedStyle(probe).backgroundColor;

        probe.remove();

        expect(hoveredBackground).not.toBe(restingBackground);
        expect(hoveredBackground).not.toBe(fullWash);
        expect(getComputedStyle(row).transform).toBe('none');
    });
});

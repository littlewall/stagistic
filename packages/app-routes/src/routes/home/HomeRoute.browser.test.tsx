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

import {HomeRoute} from './HomeRoute';

const {
    headerProps,
    modalActions,
    scriptsState,
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
        }),
    };
});

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
    root.render(
        <MemoryRouter>
            <HomeRoute />
        </MemoryRouter>,
    );
    roots.push(root);
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

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    scriptsState.summaries = [];
    headerProps.showScriptActions = null;
    Object.values(modalActions).forEach(action => action.mockReset());
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
        expect(exampleScript?.disabled).toBe(true);
        expect(document.querySelector('[role="group"][aria-label="Start a script"]')).toBeTruthy();
        expect(document.querySelector('input[type="search"]')).toBeNull();
        expect(headerProps.showScriptActions).toBe(false);

        await userEvent.click(newScript as HTMLButtonElement);
        await userEvent.click(importScript as HTMLButtonElement);

        expect(modalActions.openNewScript).toHaveBeenCalledTimes(1);
        expect(modalActions.openImportScript).toHaveBeenCalledTimes(1);
    });

    it('shows each script once in a single searchable library', async () => {
        scriptsState.summaries = [
            {
                id: 'script-1',
                title: 'One draft',
                subtitle: null,
                activeBlockId: null,
                createdAt: 1,
                updatedAt: 2,
            },
        ];

        mountHome();
        await waitForText('One draft');

        const scriptButtons = Array.from(document.querySelectorAll('button'))
            .filter(button => button.textContent?.includes('One draft'));

        expect(scriptButtons).toHaveLength(1);
        expect(document.querySelector('input[type="search"]')).toBeTruthy();
        expect(document.body.textContent).not.toContain('Continue writing');
        expect(document.body.textContent).not.toContain('Recently edited');
        expect(document.body.textContent).not.toContain('All scripts');
    });
});

import '../../styles/base.css';

import type {ReactElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {PageContainer} from '../organisms/PageContainer/PageContainer';
import {AppHeader, ScriptEditorAppHeader} from './AppHeader';

let root: Root | null = null;

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

const mountHeader = (saveVerb?: 'Save' | 'Download') => {
    const host = document.createElement('div');
    const actions: string[] = [];

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ScriptEditorAppHeader
            currentScript={{id: 'script-1', name: 'One Small Light'}}
            onHome={() => {}}
            activeView="editor"
            onSelectView={() => {}}
            onMenuAction={action => actions.push(action)}
            onRenameScript={() => {}}
            saveVerb={saveVerb}
        />,
    );

    return {actions};
};

const mountHeaderWithName = (name: string) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ScriptEditorAppHeader
            currentScript={{id: 'script-1', name}}
            onHome={() => {}}
            activeView="editor"
            onSelectView={() => {}}
            onRenameScript={() => {}}
            scriptSyncState="saving"
        />,
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ScriptEditorAppHeader', () => {
    it('shows script identity separately from its direct actions', async () => {
        mountHeader();

        await waitForElement('input[aria-label="Script name"]');

        expect(document.querySelector('button[aria-label="Open script settings"]')).not.toBeNull();
        expect(document.querySelector('button[aria-label="Open attribute manager"]')).not.toBeNull();
        expect(document.querySelector('button[aria-label="Download script"]')).not.toBeNull();
    });

    it('words the file action as Save when the Surface opens a Save dialog', async () => {
        mountHeader('Save');

        await waitForElement('button[aria-label="Save script"]');

        expect(document.querySelector('button[aria-label="Download script"]')).toBeNull();
    });

    it('keeps the sync status in a fixed lane directly after the truncated script title', async () => {
        mountHeaderWithName('A script title long enough to exceed the available header identity space');

        const identity = await waitForElement<HTMLElement>('[data-script-identity]');
        const title = await waitForElement<HTMLInputElement>('input[aria-label="Script name"]');
        const status = await waitForElement<HTMLElement>('[data-sync-status]');
        const identityStyle = window.getComputedStyle(identity);
        const titleRect = title.getBoundingClientRect();
        const statusRect = status.getBoundingClientRect();

        expect(identityStyle.display).toBe('grid');
        expect(status.parentElement).toBe(identity);
        expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
        expect(statusRect.left - titleRect.right).toBeLessThanOrEqual(8);
        expect(statusRect.width).toBeGreaterThanOrEqual(20);
    });

    it('offers both script download formats', async () => {
        const {actions} = mountHeader();

        await userEvent.click(await waitForElement('button[aria-label="Open script settings"]'));
        await userEvent.click(await waitForElement('button[aria-label="Open attribute manager"]'));
        await userEvent.click(await waitForElement('button[aria-label="Download script"]'));
        await userEvent.click(await waitForElement('[role="menuitem"]'));
        await userEvent.click(await waitForElement('button[aria-label="Download script"]'));

        const stepkgItem = [...document.querySelectorAll('[role="menuitem"]')].find(item => item.textContent === 'Script & metadata (.stepkg)');

        if (!stepkgItem) {
            throw new Error('Expected .stepkg download menu item.');
        }

        await userEvent.click(stepkgItem);

        expect(actions).toEqual([
            'settings',
            'attributes',
            'export-stagistic',
            'export-stepkg',
        ]);
    });

    it('commits a single-line rename and leaves Tab navigation intact', async () => {
        const onRenameScript = vi.fn();
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <ScriptEditorAppHeader
                currentScript={{id: 'script-1', name: 'One Small Light'}}
                onHome={() => {}}
                activeView="editor"
                onSelectView={() => {}}
                onRenameScript={onRenameScript}
            />,
        );

        const input = await waitForElement<HTMLInputElement>('input[aria-label="Script name"]');

        await userEvent.click(input);
        await userEvent.keyboard('Second{Enter}');

        expect(onRenameScript).toHaveBeenCalledWith('Second');

        await userEvent.click(input);
        await userEvent.keyboard('Discarded{Escape}');

        expect(onRenameScript).toHaveBeenCalledTimes(1);

        await userEvent.click(input);
        await userEvent.keyboard('{Tab}');

        expect(document.activeElement).not.toBe(input);
    });
});

describe('AppHeader width variants', () => {
    const mountHeaderAt = (hostWidth: number, element: ReactElement) => {
        const host = document.createElement('div');

        host.style.width = `${hostWidth}px`;
        document.body.appendChild(host);
        root = createRoot(host);
        root.render(element);
    };

    const innerBox = async () => (await waitForElement<HTMLElement>('[data-header-inner]')).getBoundingClientRect();

    it('caps the Board header at the Board column width and centers it', async () => {
        mountHeaderAt(
            2200, (
                <ScriptEditorAppHeader
                    currentScript={{id: 'script-1', name: 'One Small Light'}}
                    onHome={() => {}}
                    activeView="board"
                    onSelectView={() => {}}
                    width="board"
                />
            ),
        );

        const rect = await innerBox();

        expect(rect.width).toBe(1680);
        expect(rect.left).toBeCloseTo(260, 1);
        expect(rect.right).toBeCloseTo(1940, 1);
    });

    it('keeps the Editor header full width by default', async () => {
        mountHeaderAt(
            2200, (
                <ScriptEditorAppHeader
                    currentScript={{id: 'script-1', name: 'One Small Light'}}
                    onHome={() => {}}
                    activeView="editor"
                    onSelectView={() => {}}
                />
            ),
        );

        expect((await innerBox()).width).toBe(2200);
    });

    it('keeps the standard header at the homepage width', async () => {
        mountHeaderAt(2200, <AppHeader onHome={() => {}} />);

        expect((await innerBox()).width).toBe(1400);
    });
});

describe('AppHeader window controls', () => {
    const mountHeaderAt = (hostWidth: number, element: ReactElement) => {
        const host = document.createElement('div');

        host.style.width = `${hostWidth}px`;
        document.body.appendChild(host);
        root = createRoot(host);
        root.render(element);
    };

    const editorHeader = (
        <ScriptEditorAppHeader
            currentScript={{id: 'script-1', name: 'One Small Light'}}
            onHome={() => {}}
            activeView="editor"
            onSelectView={() => {}}
            onOpenSettings={() => {}}
        />
    );

    const homeLeft = async () => (await waitForElement<HTMLElement>('[aria-label="Go to home"]')).getBoundingClientRect().left;

    afterEach(() => {
        document.documentElement.style.removeProperty('--window-controls-start');
        document.documentElement.style.removeProperty('--window-controls-end');
    });

    it('keeps the leading controls clear of window controls at the window edge', async () => {
        document.documentElement.style.setProperty('--window-controls-start', '92px');
        mountHeaderAt(1200, <AppHeader onHome={() => {}} />);

        expect(await homeLeft()).toBeCloseTo(92, 1);
    });

    it('adds no inset when the capped header content already clears the window controls', async () => {
        document.documentElement.style.setProperty('--window-controls-start', '92px');
        mountHeaderAt(2200, <AppHeader onHome={() => {}} />);

        // The 1400px column starts at 400px; its 12px padding puts Home at 412px.
        expect(await homeLeft()).toBeCloseTo(412, 1);
    });

    it('keeps the middle column on the window centre while insetting the edges', async () => {
        document.documentElement.style.setProperty('--window-controls-start', '92px');
        document.documentElement.style.setProperty('--window-controls-end', '140px');
        mountHeaderAt(1600, editorHeader);

        const inner = await waitForElement<HTMLElement>('[data-header-inner]');
        const middle = (inner.children[1] as HTMLElement).getBoundingClientRect();
        const settings = (await waitForElement<HTMLElement>('[aria-label="Open settings"]')).getBoundingClientRect();

        expect(await homeLeft()).toBeCloseTo(92, 1);
        expect(settings.right).toBeCloseTo(1600 - 140, 1);
        expect(middle.left + (middle.width / 2)).toBeCloseTo(800, 1);
    });

    it('lines the first and last icons up with the page content', async () => {
        mountHeaderAt(
            1916, (
                <>
                    <AppHeader onHome={() => {}} onOpenSettings={() => {}} contentInset="page" />
                    <PageContainer><div data-page-content>Scripts</div></PageContainer>
                </>
            ),
        );

        const content = (await waitForElement<HTMLElement>('[data-page-content]')).getBoundingClientRect();
        const homeIcon = (await waitForElement<SVGElement>('[aria-label="Go to home"] svg')).getBoundingClientRect();
        const settingsIcon = (await waitForElement<SVGElement>('[aria-label="Open settings"] svg')).getBoundingClientRect();

        expect(homeIcon.left).toBeCloseTo(content.left, 1);
        expect(settingsIcon.right).toBeCloseTo(content.right, 1);
    });

    it('adds no inset on the web', async () => {
        mountHeaderAt(1200, <AppHeader onHome={() => {}} />);

        expect(await homeLeft()).toBeCloseTo(12, 1);
    });
});

describe('AppHeader settings', () => {
    it('opens the app settings from the header', async () => {
        const onOpenSettings = vi.fn();
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(<AppHeader onHome={() => {}} onOpenSettings={onOpenSettings} />);

        await userEvent.click(await waitForElement('button[aria-label="Open settings"]'));

        expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('keeps the app settings apart from the script settings', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <ScriptEditorAppHeader
                currentScript={{id: 'script-1', name: 'One Small Light'}}
                onHome={() => {}}
                onOpenSettings={() => {}}
                activeView="editor"
                onSelectView={() => {}}
                onMenuAction={() => {}}
            />,
        );

        await waitForElement('button[aria-label="Open settings"]');

        expect(document.querySelector('button[aria-label="Open script settings"]')).not.toBeNull();
    });
});

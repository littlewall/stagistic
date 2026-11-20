import '@stagistic/ui/styles/base.css';

import {APP_THEME_STORAGE_KEY, BrowserDataNotice} from '@stagistic/ui';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {AppSettingsModal} from './AppSettingsModal';
import type {AppSettingsSection} from './types';

let mountedRoot: Root | null = null;

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

const findNavButton = (label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('aside button')].find(item => item.textContent === label);

    if (!button) {
        throw new Error(`Expected a ${label} section`);
    }

    return button;
};

const mount = (sections?: AppSettingsSection[]) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(
        <AppSettingsModal
            isOpen
            sections={sections}
            onClose={() => {}}
        />,
    );
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
    window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme-mode');
    document.documentElement.removeAttribute('data-theme');
});

describe('AppSettingsModal', () => {
    it('opens on Appearance and stores the chosen color mode', async () => {
        mount();

        await waitForElement('dialog[aria-label="Settings"]');

        expect(findNavButton('Appearance').getAttribute('aria-current')).toBe('page');

        await userEvent.click(await waitForElement('button[aria-label="Dark"]'));

        await expect.poll(() => window.localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('dark');
        await expect.poll(() => document.documentElement.getAttribute('data-theme-mode')).toBe('dark');
    });

    it('shows the browser data notice as a Storage panel, not a modal', async () => {
        mount([
            {
                id: 'storage',
                label: 'Storage',
                content: <BrowserDataNotice />,
            },
        ]);

        await waitForElement('dialog[aria-label="Settings"]');

        expect([...document.querySelectorAll('aside button')].map(item => item.textContent)).toEqual(['Appearance', 'Storage']);

        await userEvent.click(findNavButton('Storage'));

        await waitForElement('h2');

        const points = [...document.querySelectorAll<HTMLUListElement>('dialog ul')].at(-1);

        expect(points?.querySelectorAll('li')).toHaveLength(3);
        expect(points?.textContent).toContain('Clearing browser data removes them.');
        expect(document.querySelectorAll('dialog')).toHaveLength(1);
    });

    it('has no Storage tab without platform sections (desktop)', async () => {
        mount();

        await waitForElement('dialog[aria-label="Settings"]');

        expect([...document.querySelectorAll('aside button')].map(item => item.textContent)).toEqual(['Appearance']);
    });

    it('lists platform sections after Appearance and shows their content', async () => {
        mount([
            {
                id: 'mcp',
                label: 'MCP',
                content: <p data-testid="mcp-content">MCP panel</p>,
            },
        ]);

        await waitForElement('dialog[aria-label="Settings"]');

        expect([...document.querySelectorAll('aside button')].map(item => item.textContent)).toEqual(['Appearance', 'MCP']);
        expect(document.querySelector('[data-testid="mcp-content"]')).toBeNull();

        await userEvent.click(findNavButton('MCP'));

        await waitForElement('[data-testid="mcp-content"]');

        expect(findNavButton('MCP').getAttribute('aria-current')).toBe('page');
        expect(document.querySelector('[aria-labelledby="app-settings-color-mode"]')).toBeNull();
    });
});

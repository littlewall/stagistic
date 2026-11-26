import {storeLastSeenRelease} from '@stagistic/app-routes';
import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {version as rootReleaseNumber} from '../../../package.json';

const STORAGE_KEY = 'stagistic.web.publicPreviewAcknowledgement';
const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean, timeoutMs = 1000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

afterEach(async () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('stagistic.lastSeenRelease');
    vi.unstubAllGlobals();
    await page.viewport(1280, 800);
});

describe('App', () => {
    it('shows keyboard focus in the preview dialog before any route layout mounts', async () => {
        window.localStorage.removeItem(STORAGE_KEY);
        await page.viewport(1280, 800);

        const {default: App} = await import('./App');
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<App />);
        mountedRoots.push(root);
        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);
        await userEvent.tab();

        const focused = requireValue(document.activeElement);

        expect(document.querySelector('dialog')?.contains(focused)).toBe(true);
        expect(getComputedStyle(focused).outlineStyle).toBe('solid');
        expect(getComputedStyle(focused).outlineWidth).toBe('2px');
    });

    it('starts the database worker only after the browser notice is acknowledged', async () => {
        const NativeWorker = window.Worker;
        let startedWorkerCount = 0;

        class TrackingWorker extends NativeWorker {
            constructor(scriptURL: string | URL, options?: WorkerOptions) {
                super(scriptURL, options);
                startedWorkerCount += 1;
            }
        }

        window.localStorage.removeItem(STORAGE_KEY);
        vi.stubGlobal('Worker', TrackingWorker);
        await page.viewport(1280, 800);

        const {default: App} = await import('./App');
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<App />);
        mountedRoots.push(root);

        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        expect(startedWorkerCount).toBe(0);

        const continueButton = requireValue(document.querySelector<HTMLButtonElement>('dialog button'));

        await page.elementLocator(continueButton).click();
        await waitFor(() => startedWorkerCount === 1);

        expect(startedWorkerCount).toBe(1);
    });

    it('shows the Release number in the footer and reaches What\'s new and its All Releases link from it', async () => {
        window.localStorage.setItem(STORAGE_KEY, '1');
        storeLastSeenRelease(rootReleaseNumber);
        await page.viewport(1280, 800);

        const {default: App} = await import('./App');
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<MemoryRouter><App /></MemoryRouter>);
        mountedRoots.push(root);

        const findButton = (scope: ParentNode, label: string) => [...scope.querySelectorAll('button')].find(button => button.textContent === label);
        const waitUntil = async (predicate: () => boolean) => {
            const deadline = Date.now() + 20_000;

            while (Date.now() < deadline) {
                if (predicate()) {
                    return;
                }

                await new Promise(resolve => window.setTimeout(resolve, 20));
            }

            throw new Error('Timed out waiting for condition');
        };
        const openDialog = (label: string) => document.querySelector<HTMLDialogElement>(`dialog[aria-label="${label}"][open]`);

        await waitUntil(() => document.querySelector('footer') !== null);

        const footer = requireValue(document.querySelector('footer'));

        expect(footer.textContent).toContain(`Release ${rootReleaseNumber}•What's new`);
        expect(footer.textContent).not.toContain('Stagistic Editor');
        expect(footer.textContent?.toLowerCase()).not.toContain('preview');

        await page.elementLocator(requireValue(findButton(footer, 'What\'s new'))).click();
        await waitUntil(() => openDialog('What\'s new') !== null);

        const whatsNew = requireValue(openDialog('What\'s new'));

        const allReleases = requireValue([...whatsNew.querySelectorAll('a')].find(link => link.textContent === 'All Releases'));

        expect(allReleases.getAttribute('href')).toBe('https://stagistic.com/changelog');
        expect(allReleases.target).toBe('_blank');
        expect(allReleases.rel).toBe('noopener noreferrer');
        expect(openDialog('Your scripts live in this browser')).toBeNull();
    });

    it('offers a reload in the footer when the server reports a newer Release, and ignores a page served instead', async () => {
        window.localStorage.setItem(STORAGE_KEY, '1');
        storeLastSeenRelease(rootReleaseNumber);
        await page.viewport(1280, 800);

        let versionResponse = () => new Response('<!doctype html><html></html>', {headers: {'content-type': 'text/html'}});
        const realFetch = window.fetch.bind(window);

        vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
            return input === '/version.json' ? Promise.resolve(versionResponse()) : realFetch(input, init);
        });

        const {default: App} = await import('./App');
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<MemoryRouter><App /></MemoryRouter>);
        mountedRoots.push(root);
        await waitFor(() => document.querySelector('footer') !== null, 20_000);

        const hasReload = () => [...document.querySelectorAll('footer button')].some(button => button.textContent?.startsWith('A new Release is ready'));

        // The host's fallback page for a missing version.json changes nothing.
        window.dispatchEvent(new Event('focus'));
        await new Promise(resolve => window.setTimeout(resolve, 100));
        expect(hasReload()).toBe(false);

        // The minimum gap between checks is a minute; a real focus after it would check again.
        versionResponse = () => new Response(
            '{"release":"99.0.0","dbGeneration":"33/20261103094608_scene_arc_range_on_card/0.3.15"}',
            {headers: {'content-type': 'application/json'}},
        );
        vi.useFakeTimers({toFake: ['Date']});
        vi.setSystemTime(Date.now() + 120_000);
        window.dispatchEvent(new Event('focus'));
        vi.useRealTimers();
        await waitFor(hasReload);

        expect(hasReload()).toBe(true);
    });
});

import '@stagistic/ui/styles/base.css';

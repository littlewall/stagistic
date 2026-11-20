import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {
    createScript,
    findButton,
    mountApp,
    waitFor,
} from './boardTestFixtures';
import {LAST_SEEN_RELEASE_KEY} from './releaseAnnouncementFixtures';

vi.mock('@stagistic/release-notes/bundled', async () => (await import('./releaseAnnouncementFixtures')).bundledReleaseNotes);

const whatsNewDialog = () => document.querySelector<HTMLDialogElement>('dialog[aria-label="What\'s new"][open]');
const unseenDot = () => document.querySelector('footer [data-unseen-dot]');
const settle = () => new Promise(resolve => window.setTimeout(resolve, 400));

afterEach(() => {
    window.localStorage.removeItem(LAST_SEEN_RELEASE_KEY);
});

describe('Release announcement', () => {
    it('shows an existing writer the merged Highlights once on the script list, breaking change first', async () => {
        await createScript();
        window.localStorage.removeItem(LAST_SEEN_RELEASE_KEY);
        await mountApp('/');

        const popup = await waitFor(whatsNewDialog);
        const text = popup.textContent;

        expect(text).toContain('Boards everywhere');
        expect(text).toContain('Breaking change');
        expect(text.indexOf('Exports changed')).toBeLessThan(text.indexOf('Boards everywhere'));
        expect(text).not.toContain('Quiet fix');
        expect(window.localStorage.getItem(LAST_SEEN_RELEASE_KEY)).toBe('0.3.0');

        await page.elementLocator(requireValue(findButton('Got it'))).click();
        await waitFor(() => whatsNewDialog() === null);
        expect(unseenDot()).toBeNull();
    });

    it('does not announce again on the next visit to the list', async () => {
        await createScript();
        window.localStorage.setItem(LAST_SEEN_RELEASE_KEY, '0.3.0');
        await mountApp('/');
        await waitFor(() => document.querySelector('section'));
        await settle();

        expect(whatsNewDialog()).toBeNull();
        expect(unseenDot()).toBeNull();
    });

    it('shows only a dot inside a script, then the popup on the list', async () => {
        const {scriptId} = await createScript();

        window.localStorage.setItem(LAST_SEEN_RELEASE_KEY, '0.1.0');
        await mountApp(`/script/${scriptId}/editor`);
        await waitFor(() => document.querySelector('footer'));
        await waitFor(unseenDot);
        await settle();

        expect(whatsNewDialog()).toBeNull();
        expect(window.localStorage.getItem(LAST_SEEN_RELEASE_KEY)).toBe('0.1.0');

        await page.elementLocator(requireValue(findButton('Go to home'))).click();

        const popup = await waitFor(whatsNewDialog);

        expect(popup.textContent).toContain('Boards everywhere');
        expect(unseenDot()).toBeNull();
    });
});

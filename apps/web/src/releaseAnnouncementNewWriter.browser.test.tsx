import '@stagistic/ui/styles/base.css';

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {mountApp, waitFor} from './boardTestFixtures';
import {LAST_SEEN_RELEASE_KEY} from './releaseAnnouncementFixtures';

vi.mock('@stagistic/release-notes/bundled', async () => (await import('./releaseAnnouncementFixtures')).bundledReleaseNotes);

afterEach(() => {
    window.localStorage.removeItem(LAST_SEEN_RELEASE_KEY);
});

/*
 * Its own file: the script list is a module-level store, so a file that creates scripts first
 * would hand this test a stale, non-empty list.
 */
describe('Release announcement for a new writer', () => {
    it('stays quiet and records the Release silently', async () => {
        window.localStorage.removeItem(LAST_SEEN_RELEASE_KEY);
        await mountApp('/');
        await waitFor(() => document.body.textContent.includes('No scripts yet.'));
        await waitFor(() => window.localStorage.getItem(LAST_SEEN_RELEASE_KEY));
        await new Promise(resolve => window.setTimeout(resolve, 400));

        expect(window.localStorage.getItem(LAST_SEEN_RELEASE_KEY)).toBe('0.3.0');
        expect(document.querySelector('dialog[open]')).toBeNull();
        expect(document.querySelector('footer [data-unseen-dot]')).toBeNull();
    });
});

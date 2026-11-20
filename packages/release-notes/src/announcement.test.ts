import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {announceReleases, isPatchRelease} from './index';

interface TestRelease {
    release: string,
    notes: {
        title: string,
        highlight: boolean,
        breaking: boolean,
    }[],
}

const note = (title: string, highlight = true, breaking = false) => ({
    title,
    highlight,
    breaking,
});

const RELEASES: TestRelease[] = [
    {release: '0.4.1', notes: [note('Patch highlight')]},
    {release: '0.4.0', notes: [note('Boards'), note('Small tweak', false)]},
    {release: '0.3.0', notes: [note('Quiet change', false)]},
    {release: '0.2.0', notes: [note('Templates'), note('Data move', true, true)]},
];

const announce = (input: {
    currentRelease: string,
    lastSeenRelease: string | null | undefined,
    hasScripts: boolean | undefined,
    releases?: TestRelease[],
}) => announceReleases({releases: RELEASES, ...input});

const titles = (releases: TestRelease[]) => releases.map(release => release.notes.map(item => item.title));

describe('isPatchRelease', () => {
    it('is true only when the patch number is above zero', () => {
        expect(isPatchRelease('0.4.1')).toBe(true);
        expect(isPatchRelease('0.4.0')).toBe(false);
        expect(isPatchRelease('1.0.0')).toBe(false);
    });
});

describe('announceReleases', () => {
    it('shows a new writer with no scripts nothing and records the Release silently', () => {
        const result = announce({
            currentRelease: '0.4.0',
            lastSeenRelease: null,
            hasScripts: false,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: true,
        });
    });

    it('treats an existing writer with no stored Release as having seen nothing', () => {
        const result = announce({
            currentRelease: '0.2.0',
            lastSeenRelease: null,
            hasScripts: true,
        });

        expect(result.popup).toBe(true);
        expect(result.hasUnseenRelease).toBe(true);
        expect(result.markSeen).toBe(false);
        expect(titles(result.releases)).toEqual([['Templates', 'Data move']]);
    });

    it('merges skipped Releases into one list, newest first, with only the Highlights', () => {
        const result = announce({
            currentRelease: '0.4.0',
            lastSeenRelease: '0.1.0',
            hasScripts: true,
        });

        expect(result.popup).toBe(true);
        expect(result.releases.map(release => release.release)).toEqual(['0.4.0', '0.2.0']);
        expect(titles(result.releases)).toEqual([['Boards'], ['Templates', 'Data move']]);
    });

    it('does not offer Releases newer than the build', () => {
        const result = announce({
            currentRelease: '0.2.0',
            lastSeenRelease: '0.1.0',
            hasScripts: true,
        });

        expect(result.releases.map(release => release.release)).toEqual(['0.2.0']);
    });

    it('only shows what is newer than the last seen Release', () => {
        const result = announce({
            currentRelease: '0.4.0',
            lastSeenRelease: '0.2.0',
            hasScripts: true,
        });

        expect(result.releases.map(release => release.release)).toEqual(['0.4.0']);
    });

    it('records the Release silently when the unseen Releases have no Highlight', () => {
        const result = announce({
            currentRelease: '0.3.0',
            lastSeenRelease: '0.2.0',
            hasScripts: true,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: true,
        });
    });

    it('hides a patch Release with a Highlight, with no dot or popup', () => {
        const result = announce({
            currentRelease: '0.4.1',
            lastSeenRelease: '0.4.0',
            hasScripts: true,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: true,
        });
    });

    it('records a patch-only gap silently when it has no Highlight', () => {
        const result = announce({
            currentRelease: '0.4.2',
            lastSeenRelease: '0.4.1',
            hasScripts: true,
            releases: [{release: '0.4.2', notes: [note('Fix', false)]}],
        });

        expect(result.markSeen).toBe(true);
        expect(result.popup).toBe(false);
        expect(result.hasUnseenRelease).toBe(false);
    });

    it('opens the popup for a skipped minor Release and hides the patch Highlight that came with it', () => {
        const result = announce({
            currentRelease: '0.4.1',
            lastSeenRelease: '0.3.0',
            hasScripts: true,
        });

        expect(result.popup).toBe(true);
        expect(result.releases.map(release => release.release)).toEqual(['0.4.0']);
    });

    it('does nothing once the current Release has been seen', () => {
        const result = announce({
            currentRelease: '0.4.0',
            lastSeenRelease: '0.4.0',
            hasScripts: true,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: false,
        });
    });

    it('never shows anything when the stored Release is newer than the build, and keeps it', () => {
        const result = announce({
            currentRelease: '0.2.0',
            lastSeenRelease: '0.9.0',
            hasScripts: true,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: false,
        });
    });

    it('treats an invalid stored value like a missing one', () => {
        const withScripts = announce({
            currentRelease: '0.2.0',
            lastSeenRelease: 'banana',
            hasScripts: true,
        });
        const withoutScripts = announce({
            currentRelease: '0.2.0',
            lastSeenRelease: '0.2',
            hasScripts: false,
        });

        expect(withScripts.popup).toBe(true);
        expect(withoutScripts.markSeen).toBe(true);
        expect(withoutScripts.popup).toBe(false);
    });

    it('waits while it is not known whether the writer has scripts', () => {
        const result = announce({
            currentRelease: '0.4.0',
            lastSeenRelease: null,
            hasScripts: undefined,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: false,
        });
    });

    it('shows nothing and writes nothing when storage is unavailable', () => {
        const result = announce({
            currentRelease: '0.4.0',
            lastSeenRelease: undefined,
            hasScripts: true,
        });

        expect(result).toEqual({
            releases: [],
            popup: false,
            hasUnseenRelease: false,
            markSeen: false,
        });
    });

    it('shows nothing when the build has no Release notes yet and records the Release', () => {
        const result = announce({
            currentRelease: '0.1.0',
            lastSeenRelease: null,
            hasScripts: true,
            releases: [],
        });

        expect(result.popup).toBe(false);
        expect(result.markSeen).toBe(true);
    });
});

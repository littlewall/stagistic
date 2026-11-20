import '@stagistic/ui/styles/tokens.css';

import {
    BREAKING_NOTE_LABEL,
    getReleaseNoteWeight,
    RELEASE_NOTE_TYPE_LABELS,
    type ReleaseNoteType,
} from '@stagistic/release-notes';
import {requireValue} from '@stagistic/shared';
import {AppFooter} from '@stagistic/ui';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {LAST_SEEN_RELEASE_STORAGE_KEY as LAST_SEEN_KEY} from './lastSeenRelease';
import {ReleaseHighlightsPopup} from './ReleaseHighlightsPopup';
import {ReleaseNotesProvider, useWhatsNew} from './ReleaseNotesProvider';

let root: Root | null = null;

const RELEASES = [
    {
        release: '0.2.0',
        date: '2026-11-06',
        notes: [
            {
                type: 'feature' as const,
                title: 'Start from a template',
                highlight: true,
                breaking: false,
                description: 'Pick **one**.',
                docs: '/guide/templates',
            },
        ],
    },
];

const settle = () => new Promise(resolve => window.setTimeout(resolve, 40));

const Opener = () => {
    const {open} = useWhatsNew();

    return <button type="button" onClick={open}>Open from elsewhere</button>;
};

const PopupToggle = () => {
    const [isListShown, setIsListShown] = useState(true);

    return (
        <>
            <button type="button" onClick={() => setIsListShown(shown => !shown)}>Toggle list</button>
            {isListShown ? <ReleaseHighlightsPopup /> : null}
        </>
    );
};

const mount = (node: React.ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(node);
};

const dialog = () => document.querySelector<HTMLDialogElement>('dialog[aria-label="What\'s new"]');

afterEach(() => {
    window.localStorage.removeItem(LAST_SEEN_KEY);
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ReleaseNotesProvider', () => {
    it('shows the Release number in the footer and opens What\'s new from it', async () => {
        mount(
            <ReleaseNotesProvider releaseNumber="0.2.0" releases={RELEASES}>
                <AppFooter />
            </ReleaseNotesProvider>,
        );
        await settle();

        expect(document.querySelector('footer')?.textContent).toContain('Release 0.2.0');
        expect(dialog()?.open ?? false).toBe(false);

        const link = requireValue([...document.querySelectorAll<HTMLButtonElement>('footer button')].find(button => button.textContent === 'What\'s new'));

        await page.elementLocator(link).click();
        await settle();

        const opened = requireValue(dialog());

        expect(opened.open).toBe(true);
        expect(opened.textContent).toContain('Start from a template');
        expect(opened.querySelector('strong')?.textContent).toBe('one');
        expect(opened.querySelector('a')?.getAttribute('href')).toBe('https://docs.stagistic.com/guide/templates');
    });

    it('lets other parts of the app open and close it', async () => {
        mount(
            <ReleaseNotesProvider releaseNumber="0.2.0" releases={RELEASES}>
                <Opener />
            </ReleaseNotesProvider>,
        );
        await settle();

        await page.elementLocator(requireValue(document.querySelector('button'))).click();
        await settle();
        expect(dialog()?.open).toBe(true);

        const close = requireValue([...requireValue(dialog()).querySelectorAll('button')].find(button => button.textContent === 'Close'));

        await page.elementLocator(close).click();
        await settle();
        expect(dialog()?.open ?? false).toBe(false);
    });

    it('works with no Releases yet', async () => {
        mount(
            <ReleaseNotesProvider releaseNumber="0.1.0" releases={[]}>
                <AppFooter />
            </ReleaseNotesProvider>,
        );
        await settle();

        const link = requireValue([...document.querySelectorAll<HTMLButtonElement>('footer button')].find(button => button.textContent === 'What\'s new'));

        await page.elementLocator(link).click();
        await settle();

        expect(requireValue(dialog()).textContent).toContain('No release notes yet.');
    });

    it('links What\'s new to all Releases in a new tab', async () => {
        mount(
            <ReleaseNotesProvider releaseNumber="0.2.0" releases={RELEASES}>
                <Opener />
            </ReleaseNotesProvider>,
        );
        await settle();
        await page.elementLocator(requireValue(document.querySelector('button'))).click();
        await settle();

        const allReleases = requireValue([...requireValue(dialog()).querySelectorAll('a')].find(link => link.textContent === 'All Releases'));

        expect(allReleases.getAttribute('href')).toBe('https://stagistic.com/changelog');
        expect(allReleases.target).toBe('_blank');
        expect(allReleases.rel).toBe('noopener noreferrer');
        expect([...requireValue(dialog()).querySelectorAll('button')].some(button => button.textContent === 'About this browser')).toBe(false);
    });

    it('shows the same type labels as @stagistic/release-notes', async () => {
        const types: ReleaseNoteType[] = [
            'feature',
            'improvement',
            'fix',
        ];

        mount(
            <ReleaseNotesProvider
                releaseNumber="0.2.0"
                releases={[
                    {
                        release: '0.2.0',
                        date: '2026-11-06',
                        notes: types.map((type, index) => ({
                            type,
                            title: `Note ${type}`,
                            highlight: true,
                            breaking: index === 1,
                            description: 'Text.',
                        })),
                    },
                ]}
            >
                <Opener />
            </ReleaseNotesProvider>,
        );
        await settle();
        await page.elementLocator(requireValue(document.querySelector('button'))).click();
        await settle();

        const labels = [...requireValue(dialog()).querySelectorAll<HTMLElement>('[data-note-type]')];

        expect(labels.map(label => label.dataset.noteType)).toEqual([
            'improvement',
            'feature',
            'fix',
        ]);

        for (const label of labels) {
            expect(label.textContent).toBe(RELEASE_NOTE_TYPE_LABELS[label.dataset.noteType as ReleaseNoteType]);
        }

        expect(requireValue(dialog()).textContent).toContain(BREAKING_NOTE_LABEL);
    });

    it('weighs notes like the shared rule in @stagistic/release-notes', async () => {
        const notes = ([
            ['feature', true],
            ['fix', true],
            ['fix', false],
            ['improvement', false],
        ] as const).map(([type, highlight], index) => ({
            type,
            title: `Note ${index}`,
            highlight,
            breaking: false,
            description: 'Text.',
        }));

        mount(
            <ReleaseNotesProvider
                releaseNumber="0.2.0"
                releases={[
                    {
                        release: '0.2.0',
                        date: '2026-11-06',
                        notes,
                    },
                ]}
            >
                <Opener />
            </ReleaseNotesProvider>,
        );
        await settle();
        await page.elementLocator(requireValue(document.querySelector('button'))).click();
        await settle();

        const labels = [...requireValue(dialog()).querySelectorAll<HTMLElement>('[data-note-type]')];

        for (const label of labels) {
            const note = requireValue(notes.find(item => label.closest('li')?.textContent.includes(item.title)));

            expect(label.dataset.noteWeight).toBe(getReleaseNoteWeight(note));
        }

        expect(labels).toHaveLength(notes.length);
    });

    describe('announcing Highlights', () => {
        const mountAnnouncing = (hasScripts: boolean | undefined, withPopup: boolean, releases = RELEASES) => mount(
            <ReleaseNotesProvider hasScripts={hasScripts} releaseNumber="0.2.0" releases={releases}>
                <AppFooter />
                {withPopup ? <ReleaseHighlightsPopup /> : null}
            </ReleaseNotesProvider>,
        );
        const dot = () => document.querySelector('footer [data-unseen-dot]');
        const popup = () => document.querySelector<HTMLDialogElement>('dialog[aria-label="What\'s new"][open]');
        const stored = () => window.localStorage.getItem(LAST_SEEN_KEY);

        it('opens the popup once where the popup is mounted, and the dot clears', async () => {
            mountAnnouncing(true, true);
            await settle();

            const opened = requireValue(popup());

            expect(opened.textContent).toContain('Start from a template');
            expect(dot()).toBeNull();
            expect(stored()).toBe('0.2.0');

            root?.unmount();
            document.body.innerHTML = '';
            mountAnnouncing(true, true);
            await settle();

            expect(popup()).toBeNull();
        });

        it('only dots where no popup is mounted, such as inside a script', async () => {
            mountAnnouncing(true, false);
            await settle();

            expect(popup()).toBeNull();
            expect(dot()).not.toBeNull();
            expect(stored()).toBeNull();
        });

        it('clears the dot once What\'s new has been opened', async () => {
            mountAnnouncing(true, false);
            await settle();
            await page.elementLocator(requireValue(document.querySelector('footer button'))).click();
            await settle();

            expect(dot()).toBeNull();
            expect(stored()).toBe('0.2.0');
        });

        it('leads from the popup to all release notes', async () => {
            mountAnnouncing(true, true);
            await settle();
            await page.getByRole('button', {name: 'All release notes'}).click();
            await settle();

            const opened = requireValue(popup());

            expect(opened.querySelector('button')?.textContent).not.toBe('Got it');
            expect(opened.querySelector('h2')?.textContent).toBe('What\'s new in Release 0.2.0');
        });

        it('clears the dot in this tab when another tab records the Release', async () => {
            mountAnnouncing(true, false);
            await settle();
            expect(dot()).not.toBeNull();

            window.localStorage.setItem(LAST_SEEN_KEY, '0.2.0');
            window.dispatchEvent(new StorageEvent('storage', {key: LAST_SEEN_KEY, newValue: '0.2.0'}));
            await settle();

            expect(dot()).toBeNull();
        });

        it('records the Release silently for a writer without scripts', async () => {
            mountAnnouncing(false, true);
            await settle();

            expect(popup()).toBeNull();
            expect(dot()).toBeNull();
            expect(stored()).toBe('0.2.0');
        });

        it('decides nothing while the script list is unknown', async () => {
            mountAnnouncing(undefined, true);
            await settle();

            expect(popup()).toBeNull();
            expect(dot()).toBeNull();
            expect(stored()).toBeNull();
        });

        it('shows nothing when the stored Release is newer than the build', async () => {
            window.localStorage.setItem(LAST_SEEN_KEY, '0.9.0');
            mountAnnouncing(true, true);
            await settle();

            expect(popup()).toBeNull();
            expect(dot()).toBeNull();
            expect(stored()).toBe('0.9.0');
        });

        it('shows nothing and does not crash when storage is unavailable', async () => {
            const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('denied');
            });
            const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('denied');
            });

            mountAnnouncing(true, true);
            await settle();

            expect(popup()).toBeNull();
            expect(dot()).toBeNull();
            expect(document.querySelector('footer')).not.toBeNull();

            await page.elementLocator(requireValue(document.querySelector('footer button'))).click();
            await settle();
            expect(requireValue(dialog()).open).toBe(true);

            getItem.mockRestore();
            setItem.mockRestore();
        });

        it('shows the popup at most once per session when the Release cannot be stored', async () => {
            const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('full');
            });

            mount(
                <ReleaseNotesProvider hasScripts releaseNumber="0.2.0" releases={RELEASES}>
                    <PopupToggle />
                </ReleaseNotesProvider>,
            );
            await settle();
            expect(popup()).not.toBeNull();

            await page.getByRole('button', {name: 'Got it'}).click();
            await page.getByRole('button', {name: 'Toggle list'}).click();
            await page.getByRole('button', {name: 'Toggle list'}).click();
            await settle();

            expect(popup()).toBeNull();
            setItem.mockRestore();
        });
    });
});

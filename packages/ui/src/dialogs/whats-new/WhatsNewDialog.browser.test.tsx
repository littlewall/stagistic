import '../../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {WhatsNewDialog, type WhatsNewRelease} from './WhatsNewDialog';

let root: Root | null = null;

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const RELEASES: WhatsNewRelease[] = [
    {
        release: '0.3.0',
        date: '2026-12-02',
        notes: [
            {
                type: 'improvement',
                title: 'Careful with old exports',
                breaking: true,
                highlight: true,
                description: 'Exports from **before** 0.3 open as copies.',
            },
            {
                type: 'feature',
                title: 'Start from a template',
                breaking: false,
                highlight: true,
                image: PIXEL,
                docsUrl: 'https://docs.stagistic.com/guide/templates',
                articleUrl: 'https://stagistic.com/articles/templates',
                description: 'Pick a template.\n\n- Play\n- Screenplay',
            },
            {
                type: 'fix',
                title: 'Scenes keep their order',
                breaking: false,
                highlight: false,
                description: '<script>window.__injected = true</script> Fixed.',
            },
        ],
    },
    {
        release: '0.2.0',
        date: '2026-11-06',
        notes: [
            {
                type: 'feature',
                title: 'Board',
                breaking: false,
                highlight: false,
                description: 'Plan on a wall.',
            },
        ],
    },
];

const settle = () => new Promise(resolve => window.setTimeout(resolve, 40));

const renderDialog = (props: Partial<React.ComponentProps<typeof WhatsNewDialog>> = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <WhatsNewDialog
            isOpen
            releases={RELEASES}
            onClose={vi.fn()}
            {...props}
        />,
    );
};

const dialog = () => requireValue(document.querySelector<HTMLDialogElement>('dialog[aria-label="What\'s new"]'));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
    delete (window as {__injected?: boolean}).__injected;
});

describe('WhatsNewDialog', () => {
    it('lists every Release in the given order with a plain date', async () => {
        renderDialog();
        await settle();

        // The newest Release is named in the dialog title; older ones keep their own heading.
        expect(dialog().querySelector('h2')?.textContent).toBe('What\'s new in Release 0.3.0');

        const headings = [...dialog().querySelectorAll('h3')].map(heading => heading.textContent);

        expect(headings).toEqual(['0.2.0']);

        const times = [...dialog().querySelectorAll('time')];

        expect(times.map(time => time.dateTime)).toEqual(['2026-12-02', '2026-11-06']);
        expect(times.map(time => time.textContent)).toEqual(['2 December 2026', '6 November 2026']);
    });

    it('puts breaking notes first, then orders by type, each note labelled by its type', async () => {
        renderDialog();
        await settle();

        const text = requireValue(dialog().querySelector('section')).textContent;

        expect(text.indexOf('Breaking change')).toBeGreaterThan(-1);
        expect(text.indexOf('Careful with old exports')).toBeLessThan(text.indexOf('Start from a template'));
        expect(text.indexOf('Start from a template')).toBeLessThan(text.indexOf('Scenes keep their order'));
        expect(dialog().querySelectorAll('h4')).toHaveLength(0);

        const labels = [...dialog().querySelectorAll<HTMLElement>('[data-note-type]')]
            .map(label => [label.dataset.noteType, label.textContent]);

        expect(labels).toEqual([
            ['improvement', 'Improved'],
            ['feature', 'New'],
            ['fix', 'Fixed'],
            ['feature', 'New'],
        ]);
        expect([...dialog().querySelectorAll<HTMLElement>('[data-note-type]')].map(label => label.dataset.noteWeight)).toEqual([
            'highlight',
            'highlight',
            'fix',
            'plain',
        ]);
        expect(dialog().querySelectorAll('[data-breaking]')).toHaveLength(1);
    });

    it('renders Markdown safely, links, and an optional image', async () => {
        renderDialog();
        await settle();

        expect(dialog().querySelector('strong')?.textContent).toBe('before');
        expect([...dialog().querySelectorAll('li li')].map(item => item.textContent)).toEqual(['Play', 'Screenplay']);
        expect(dialog().querySelector('script')).toBeNull();
        expect(dialog().textContent).toContain('<script>window.__injected = true</script> Fixed.');
        expect((window as {__injected?: boolean}).__injected).toBeUndefined();

        const docs = requireValue(dialog().querySelector<HTMLAnchorElement>('a[href="https://docs.stagistic.com/guide/templates"]'));
        const article = requireValue(dialog().querySelector<HTMLAnchorElement>('a[href="https://stagistic.com/articles/templates"]'));

        expect(docs.textContent).toBe('Read the guide');
        expect(article.textContent).toBe('Read the article');
        expect(docs.target).toBe('_blank');
        expect(docs.rel).toContain('noopener');

        const images = dialog().querySelectorAll('img');

        expect(images).toHaveLength(1);
        expect(images[0].getAttribute('src')).toBe(PIXEL);
        expect(images[0].alt).toBe('');
        // A cover: right under the note title, before the text.
        expect(images[0].previousElementSibling?.tagName).toBe('P');
        expect(images[0].previousElementSibling?.textContent).toContain('Start from a template');
    });

    it('drops an image that fails to load', async () => {
        renderDialog({
            releases: [
                {
                    release: '0.2.0',
                    date: '2026-11-06',
                    notes: [
                        {
                            type: 'feature',
                            title: 'Board',
                            breaking: false,
                            highlight: false,
                            image: '/release-images/missing.png',
                            description: 'Plan on a wall.',
                        },
                    ],
                },
            ],
        });
        await settle();
        await settle();

        expect(dialog().querySelector('img')).toBeNull();
        expect(dialog().textContent).toContain('Plan on a wall.');
    });

    it('says so calmly when there are no Releases', async () => {
        renderDialog({releases: []});
        await settle();

        expect(dialog().textContent).toContain('No release notes yet.');
        expect(dialog().querySelector('h3')).toBeNull();
    });

    it('links to all Releases in a new tab, and offers no browser notice', async () => {
        renderDialog({releases: []});
        await settle();

        const link = requireValue([...dialog().querySelectorAll('a')].find(anchor => anchor.textContent === 'All Releases'));

        expect(link.getAttribute('href')).toBe('https://stagistic.com/changelog');
        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener noreferrer');
        expect(dialog().textContent).not.toContain('About this browser');
    });

    it('closes from the × in the header', async () => {
        const onClose = vi.fn();

        renderDialog({onClose});
        await settle();

        const close = requireValue(dialog().querySelector<HTMLButtonElement>('button[aria-label="Close"]'));

        await page.elementLocator(close).click();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes from the Close button', async () => {
        const onClose = vi.fn();

        renderDialog({onClose});
        await settle();

        const close = requireValue([...dialog().querySelectorAll('button')].find(button => button.textContent === 'Close'));

        await page.elementLocator(close).click();
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

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

import {ReleaseHighlightsDialog} from './ReleaseHighlightsDialog';
import type {WhatsNewNote} from './WhatsNewDialog';

let root: Root | null = null;

const NOTES: WhatsNewNote[] = [
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
        docsUrl: 'https://docs.stagistic.com/guide/templates',
        description: 'Pick a template.',
    },
];

const settle = () => new Promise(resolve => window.setTimeout(resolve, 40));

const renderDialog = (props: Partial<React.ComponentProps<typeof ReleaseHighlightsDialog>> = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ReleaseHighlightsDialog
            isOpen
            notes={NOTES}
            onClose={vi.fn()}
            onOpenAllNotes={vi.fn()}
            {...props}
        />,
    );
};

const dialog = () => requireValue(document.querySelector<HTMLDialogElement>('dialog[aria-label="What\'s new"]'));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ReleaseHighlightsDialog', () => {
    it('shows the given notes with Markdown and links, without Release headings', async () => {
        renderDialog();
        await settle();

        expect(dialog().textContent).toContain('Start from a template');
        expect(dialog().querySelector('strong')?.textContent).toBe('before');
        expect(dialog().querySelector('a[href="https://docs.stagistic.com/guide/templates"]')?.textContent).toBe('Read the guide');
        expect(dialog().querySelector('h3')).toBeNull();
    });

    it('warns about a breaking change and lists it first', async () => {
        renderDialog();
        await settle();

        const text = dialog().textContent;

        expect(text).toContain('Breaking change');
        expect(text).toContain('affects how your existing work behaves');
        expect(text.indexOf('Careful with old exports')).toBeLessThan(text.indexOf('Start from a template'));
        expect(dialog().querySelectorAll('[data-breaking]')).toHaveLength(1);
    });

    it('adds no warning when nothing is breaking', async () => {
        renderDialog({notes: [NOTES[1]]});
        await settle();

        expect(dialog().textContent).not.toContain('Breaking change');
        expect(dialog().textContent).not.toContain('affects how your existing work behaves');
    });

    it('links to all release notes and closes with Got it', async () => {
        const onClose = vi.fn();
        const onOpenAllNotes = vi.fn();

        renderDialog({onClose, onOpenAllNotes});
        await settle();
        await page.getByRole('button', {name: 'All release notes'}).click();

        expect(onOpenAllNotes).toHaveBeenCalledTimes(1);

        await page.getByRole('button', {name: 'Got it'}).click();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes from the × in the header', async () => {
        const onClose = vi.fn();

        renderDialog({onClose});
        await settle();
        await page.elementLocator(requireValue(dialog().querySelector<HTMLButtonElement>('button[aria-label="Close"]'))).click();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes when the browser cancels the dialog (Escape)', async () => {
        const onClose = vi.fn();

        renderDialog({onClose});
        await settle();
        dialog().dispatchEvent(new Event('cancel', {cancelable: true}));

        expect(onClose).toHaveBeenCalled();
    });
});

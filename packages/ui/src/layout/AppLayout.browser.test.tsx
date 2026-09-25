import '../../styles/base.css';

import type {ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {formControlStyles} from '../molecules/forms/formControlStyles';
import {AppLayout} from './AppLayout';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const renderLayout = (children: ReactNode = <div>Script canvas</div>) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<AppLayout>{children}</AppLayout>);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AppLayout', () => {
    it('does not show a focus ring after a pointer focuses a text input', async () => {
        renderLayout(<input className={formControlStyles.input} aria-label="Script title" />);

        await waitFor(() => document.querySelector('[aria-label="Script title"]') !== null);

        const input = document.querySelector<HTMLInputElement>('[aria-label="Script title"]');

        if (!input) {
            throw new Error('Expected script title input');
        }

        await page.elementLocator(input).click();

        expect(document.activeElement).toBe(input);
        expect(window.getComputedStyle(input).outlineStyle).toBe('none');
    });

    it('shows a focus ring when the keyboard focuses a text input', async () => {
        renderLayout(<input className={formControlStyles.input} aria-label="Script title" />);

        await waitFor(() => document.querySelector('[aria-label="Script title"]') !== null);
        await userEvent.tab();

        const input = document.querySelector<HTMLInputElement>('[aria-label="Script title"]');

        expect(document.activeElement).toBe(input);
        expect(window.getComputedStyle(input as HTMLInputElement).outlineStyle).toBe('solid');
    });

    it('keeps public preview information and feedback reachable from every app screen', async () => {
        renderLayout();

        await waitFor(() => document.querySelector('footer') !== null);

        expect(document.body.textContent).toContain('💛 Stagistic Editor • Public preview');

        const feedback = document.querySelector<HTMLAnchorElement>('a[href="https://feedback.stagistic.com"]');
        const explainPreview = document.querySelector<HTMLButtonElement>('button[aria-label="What does public preview mean?"]');

        expect(feedback?.textContent).toBe('Feedback & bug reports');
        expect(feedback?.target).toBe('_blank');
        expect(explainPreview?.textContent).toBe('what does it mean?');
        expect(explainPreview?.parentElement?.textContent).toBe('💛 Stagistic Editor • Public preview (what does it mean?)');

        await page.elementLocator(explainPreview!).click();
        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
        const dialogText = dialog.textContent;

        expect(dialogText).toContain('Public preview notice');
        expect(dialogText).toContain('Stagistic Editor is in public preview.');
        expect(dialogText).toContain('Use it at your own risk.');
        expect(dialogText).toContain('stored only in this browser');
        expect(dialogText).toContain('Sync is not available yet.');
        expect(dialogText).toContain('Nothing you create is sent from your device.');
        expect(dialogText).toContain('does not send analytics, telemetry, or other usage data');
        expect(dialogText).toContain('including theme and layout');
        expect(dialogText).toContain('Back up your work regularly.');
        expect(dialogText).toContain('may permanently remove it');

        const closeButton = Array.from(dialog.querySelectorAll('button')).find(button => button.textContent === 'Close');

        expect(closeButton).toBeDefined();

        await page.elementLocator(closeButton!).click();
        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog') === null);
    });
});

import '../../styles/base.css';

import type {ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {formControlStyles} from '../molecules/forms/shared/formControlStyles';
import {AppLayout} from './AppLayout';
import {FocusVisibilityManager} from './FocusVisibilityManager';

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

    root.render(<><FocusVisibilityManager /><AppLayout>{children}</AppLayout></>);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AppLayout', () => {
    it('does not show a focus ring after a pointer focuses a text input', async () => {
        renderLayout(
            <input
                className={formControlStyles.input}
                aria-label="Script title"
            />,
        );

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
        renderLayout(
            <input
                className={formControlStyles.input}
                aria-label="Script title"
            />,
        );

        await waitFor(() => document.querySelector('[aria-label="Script title"]') !== null);
        await userEvent.tab();

        const input = document.querySelector<HTMLInputElement>('[aria-label="Script title"]');

        expect(document.activeElement).toBe(input);
        expect(window.getComputedStyle(input as HTMLInputElement).outlineStyle).toBe('solid');
    });

    it('keeps feedback reachable from every app screen and says nothing about a preview', async () => {
        renderLayout();

        await waitFor(() => document.querySelector('footer') !== null);

        const feedback = document.querySelector<HTMLAnchorElement>('a[href="https://feedback.stagistic.com"]');

        expect(feedback?.textContent).toBe('Feedback & bug reports');
        expect(feedback?.target).toBe('_blank');
        expect(document.querySelector('footer')?.textContent?.toLowerCase()).not.toContain('preview');
    });
});

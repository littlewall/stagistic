import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

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

const renderLayout = () => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <AppLayout>
            <div>Script canvas</div>
        </AppLayout>,
    );
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AppLayout', () => {
    it('keeps alpha information and feedback reachable from every app screen', async () => {
        renderLayout();

        await waitFor(() => document.querySelector('footer') !== null);

        expect(document.body.textContent).toContain('Made with 💛 in Prague');

        const feedback = document.querySelector<HTMLAnchorElement>(
            'a[href="mailto:feedback@stagistic.com"]',
        );
        const explainAlpha = document.querySelector<HTMLButtonElement>(
            'button[aria-label="What does Alpha pre-release mean?"]',
        );

        expect(feedback?.textContent).toBe('feedback@stagistic.com');
        expect(explainAlpha?.textContent).toBe('what does it mean?');
        expect(explainAlpha?.parentElement?.textContent).toBe(
            'Alpha pre-release (what does it mean?)',
        );

        await page.elementLocator(explainAlpha!).click();
        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        expect(document.querySelector('dialog')?.textContent).toContain('Alpha pre-release');

        await userEvent.keyboard('{Escape}');
        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === false);
    });
});

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {PrereleaseGate} from './PrereleaseGate';

const STORAGE_KEY = 'stagistic.web.prereleaseAcknowledgement';
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

const renderGate = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <PrereleaseGate>
            <div>Application content</div>
        </PrereleaseGate>,
    );
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
    window.localStorage.removeItem(STORAGE_KEY);
    vi.restoreAllMocks();
});

describe('PrereleaseGate', () => {
    it('blocks application content until the notice is acknowledged', async () => {
        window.localStorage.removeItem(STORAGE_KEY);
        renderGate();

        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        const dialog = document.querySelector<HTMLDialogElement>('dialog')!;

        expect(document.body.textContent).not.toContain('Application content');
        expect(dialog.textContent).toContain(
            'By continuing, you acknowledge these temporary limitations.',
        );

        const buttons = dialog.querySelectorAll('button');

        expect(buttons).toHaveLength(1);
        expect(buttons[0]?.textContent).toBe('I understand and continue');

        await userEvent.keyboard('{Escape}');
        expect(dialog.open).toBe(true);

        dialog.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
        dialog.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        expect(dialog.open).toBe(true);

        await page.elementLocator(buttons[0]).click();
        await waitFor(() => document.body.textContent?.includes('Application content') === true);

        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    });

    it('allows the current session when acknowledgement cannot be stored', async () => {
        window.localStorage.removeItem(STORAGE_KEY);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('Storage is unavailable');
        });
        renderGate();

        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        const continueButton = document.querySelector<HTMLButtonElement>('dialog button')!;

        await page.elementLocator(continueButton).click();
        await waitFor(() => document.body.textContent?.includes('Application content') === true);

        expect(document.body.textContent).toContain('Application content');
    });

    it('renders application content immediately for the current stored version', async () => {
        window.localStorage.setItem(STORAGE_KEY, '1');
        renderGate();

        await waitFor(() => document.body.textContent?.includes('Application content') === true);

        expect(document.querySelector('dialog')).toBeNull();
    });
});

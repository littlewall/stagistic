import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {AccountMenu} from './AccountMenu';

let mountedRoot: Root | null = null;

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

const mountMenu = async () => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(<AccountMenu themeMode="auto" onThemeChange={() => {}} />);

    return waitForElement<HTMLButtonElement>('button[aria-label="Appearance"]');
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('AccountMenu flushSync repro', () => {
    /*
     * A hover as the very first interaction in a fresh browser context never
     * opens the tooltip (react-aria's pointer-modality detection needs one
     * prior real interaction to "warm up"). This mirrors that so the actual
     * assertion below isn't blocked by the same cold-start quirk.
     */
    it('warm-up: establishes pointer modality before the real assertion', async () => {
        const trigger = await mountMenu();

        await userEvent.click(trigger);
        await waitForElement('[aria-label="Theme mode"]');
    });

    it('hover then click does not warn about flushSync', async () => {
        const trigger = await mountMenu();

        await userEvent.hover(trigger);
        await waitForElement('[role="tooltip"]');

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        try {
            await userEvent.click(trigger);
            await waitForElement('[aria-label="Theme mode"]');
            await new Promise(resolve => window.setTimeout(resolve, 100));

            const flushSyncCalls = errorSpy.mock.calls.filter(call =>
                typeof call[0] === 'string' && call[0].includes('flushSync'));

            expect(flushSyncCalls).toEqual([]);
        } finally {
            errorSpy.mockRestore();
        }
    });
});

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {NewScriptModal} from './NewScriptModal';

const mountedRoots: Root[] = [];

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

const renderModal = (onCreate: (...args: unknown[]) => void) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);
    const render = (isOpen: boolean, isTransitioning = false) => {
        root.render(
            <NewScriptModal
                isOpen={isOpen}
                isTransitioning={isTransitioning}
                onClose={() => {}}
                onCreate={onCreate}
            />,
        );
    };

    render(true);
    mountedRoots.push(root);

    return {render};
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('NewScriptModal', () => {
    it('submits multi-act as the default shape', async () => {
        const onCreate = vi.fn();

        renderModal(onCreate);

        const multiAct = await waitForElement<HTMLInputElement>('input[type="radio"][value="multi-act"]');

        expect(multiAct.checked).toBe(true);
        await page.elementLocator(await waitForElement('button[type="submit"]')).click();
        expect(onCreate).toHaveBeenCalledWith('', 'multi-act');
    });

    it('submits one-act and resets the choice after reopening', async () => {
        const onCreate = vi.fn();
        const modal = renderModal(onCreate);
        const oneAct = await waitForElement<HTMLInputElement>('input[type="radio"][value="one-act"]');

        await page.elementLocator(oneAct.closest('label')!).click();
        await page.elementLocator(await waitForElement('button[type="submit"]')).click();
        expect(onCreate).toHaveBeenCalledWith('', 'one-act');

        modal.render(false);
        await waitFor(() => {
            const multiAct = document.querySelector<HTMLInputElement>('input[value="multi-act"]');
            const dialog = document.querySelector<HTMLDialogElement>('dialog');

            return dialog?.open === false && multiAct?.checked === true;
        });
        modal.render(true);
        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        const multiAct = await waitForElement<HTMLInputElement>('input[type="radio"][value="multi-act"]');

        expect(multiAct.checked).toBe(true);
    });

    it('shows a loader while creation is pending and preserves the draft', async () => {
        let resolveCreate: (() => void) | undefined;
        const onCreate = vi.fn(() => new Promise<void>(resolve => {
            resolveCreate = resolve;
        }));

        renderModal(onCreate);

        const nameInput = await waitForElement<HTMLInputElement>('#script-name');
        const oneAct = await waitForElement<HTMLInputElement>('input[type="radio"][value="one-act"]');

        await page.elementLocator(nameInput).fill('Long Day');
        await page.elementLocator(oneAct.closest('label')!).click();
        await page.elementLocator(await waitForElement('button[type="submit"]')).click();
        await waitFor(() => document.querySelector(
            '[role="progressbar"][aria-label="Preparing editor"]',
        ) !== null);

        expect(document.querySelector('form')).toBeNull();

        resolveCreate?.();
        await waitFor(() => document.querySelector('form') !== null);

        const restoredNameInput = await waitForElement<HTMLInputElement>('#script-name');
        const restoredOneAct = await waitForElement<HTMLInputElement>('input[value="one-act"]');

        expect(restoredNameInput.value).toBe('Long Day');
        expect(restoredOneAct.checked).toBe(true);
    });

    it('keeps the loader visible while the editor route is transitioning', async () => {
        let resolveCreate: (() => void) | undefined;
        let creationSettled = false;
        const onCreate = vi.fn(() => new Promise<void>(resolve => {
            resolveCreate = resolve;
        }).finally(() => {
            creationSettled = true;
        }));
        const modal = renderModal(onCreate);

        await page.elementLocator(await waitForElement('button[type="submit"]')).click();
        await waitFor(() => document.querySelector(
            '[role="progressbar"][aria-label="Preparing editor"]',
        ) !== null);

        modal.render(true, true);
        await waitFor(() => document.body.textContent?.includes('Opening editor') === true);

        expect(document.body.textContent).toContain('Creating your script');

        resolveCreate?.();
        await waitFor(() => creationSettled);
        await waitFor(() => document.body.textContent?.includes('Creating your script') === false);

        expect(document.querySelector('form')).toBeNull();
        expect(document.body.textContent).toContain('Opening editor');

        modal.render(true, false);
        await waitFor(() => document.querySelector('form') !== null);
    });
});

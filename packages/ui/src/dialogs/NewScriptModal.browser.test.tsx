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
    const render = (isOpen: boolean) => {
        root.render(
            <NewScriptModal
                isOpen={isOpen}
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
});

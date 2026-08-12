import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {ModalDialog} from './ModalDialog';

const mountedRoots: Root[] = [];

const waitFor = async <T,>(getValue: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const waitForNull = async (getValue: () => unknown, label: string): Promise<void> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (!getValue()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label} to disappear`);
};

const Harness = ({initialOpen}: {initialOpen: boolean}) => {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)}>Open</button>
            <ModalDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                ariaLabel="Example dialog"
            >
                <button type="button" onClick={() => setIsOpen(false)}>Close</button>
            </ModalDialog>
        </>
    );
};

const mount = (initialOpen: boolean) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(<Harness initialOpen={initialOpen} />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('ModalDialog', () => {
    it('does not render a dialog element while closed', async () => {
        mount(false);

        await waitFor(() => document.querySelector('button'), 'open trigger');

        expect(document.querySelector('dialog')).toBeNull();
    });

    it('mounts the dialog element once opened', async () => {
        mount(false);

        const trigger = page.elementLocator(await waitFor(() => document.querySelector('button'), 'open trigger'));

        await trigger.click();

        const dialog = await waitFor(() => document.querySelector<HTMLDialogElement>('dialog'), 'dialog');

        expect(dialog.open).toBe(true);
    });

    it('removes the dialog element again after it is closed', async () => {
        mount(true);

        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog[open]'), 'open dialog');

        const closeButton = page.elementLocator(
            await waitFor(
                () => Array.from(document.querySelectorAll<HTMLButtonElement>('dialog button'))
                    .find(button => button.textContent === 'Close') ?? null,
                'close button',
            ),
        );

        await closeButton.click();

        await waitForNull(() => document.querySelector('dialog'), 'dialog');
    });
});

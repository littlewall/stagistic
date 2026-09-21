import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {TypeToConfirmAction} from './TypeToConfirmAction';

const mountedRoots: Root[] = [];

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const renderAction = (onConfirm: () => void) => {
    const host = document.createElement('div');

    host.style.width = '480px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<TypeToConfirmAction phrase="replace me" confirmLabel="Replace script" onConfirm={onConfirm} />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('TypeToConfirmAction', () => {
    it('keeps the confirm button disabled until the exact phrase is typed', async () => {
        const onConfirm = vi.fn();

        renderAction(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const button = await waitForElement<HTMLButtonElement>('button');

        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe('Replace script');

        await input.fill('replace');
        expect(button.disabled).toBe(true);

        await input.fill('replace me');
        expect(button.disabled).toBe(false);
    });

    it('calls onConfirm once unlocked, and trims surrounding whitespace', async () => {
        const onConfirm = vi.fn();

        renderAction(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const buttonElement = await waitForElement<HTMLButtonElement>('button');
        const button = page.elementLocator(buttonElement);

        await input.fill('  replace me  ');
        expect(buttonElement.disabled).toBe(false);

        await button.click();
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});

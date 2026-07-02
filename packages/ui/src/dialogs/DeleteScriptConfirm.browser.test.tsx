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

import {DeleteScriptConfirm} from './DeleteScriptConfirm';

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

const renderConfirm = (onConfirm: () => void) => {
    const host = document.createElement('div');

    host.style.width = '480px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<DeleteScriptConfirm scriptTitle="My Play" onConfirm={onConfirm} />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('DeleteScriptConfirm', () => {
    it('keeps the delete button disabled until the confirm phrase is typed exactly', async () => {
        const onConfirm = vi.fn();

        renderConfirm(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const button = await waitForElement<HTMLButtonElement>('button');

        expect(button.disabled).toBe(true);

        await input.fill('delete');
        expect(button.disabled).toBe(true);

        await input.fill('delete me');
        expect(button.disabled).toBe(false);
    });

    it('blocks the delete button while locked and calls onConfirm once unlocked', async () => {
        const onConfirm = vi.fn();

        renderConfirm(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const buttonElement = await waitForElement<HTMLButtonElement>('button');
        const button = page.elementLocator(buttonElement);

        await input.fill('nope');
        expect(buttonElement.disabled).toBe(true);
        expect(onConfirm).not.toHaveBeenCalled();

        await input.fill('delete me');
        await button.click();
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('trims surrounding whitespace when matching the phrase', async () => {
        const onConfirm = vi.fn();

        renderConfirm(onConfirm);

        const input = page.elementLocator(await waitForElement('input'));
        const button = await waitForElement<HTMLButtonElement>('button');

        await input.fill('  delete me  ');
        expect(button.disabled).toBe(false);
    });
});

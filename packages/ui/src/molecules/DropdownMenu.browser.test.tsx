import '../../styles/tokens.css';

import {Button, MenuTrigger} from 'react-aria-components';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {DropdownMenu} from './DropdownMenu';

let root: Root | null = null;

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

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('DropdownMenu', () => {
    it('composes with a caller-owned trigger', async () => {
        const onAction = vi.fn();
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <MenuTrigger>
                <Button>Open custom menu</Button>
                <DropdownMenu aria-label="Custom actions" items={[{id: 'custom-action', label: 'Custom action'}]} onAction={onAction} />
            </MenuTrigger>,
        );

        await userEvent.click(await waitForElement('button'));
        const item = await waitForElement('[role="menuitem"]');

        expect(item.textContent).toBe('Custom action');

        await userEvent.click(item);

        expect(onAction.mock.calls[0]?.[0]).toBe('custom-action');
    });
});

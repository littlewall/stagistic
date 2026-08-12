import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
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

describe('AccountMenu trigger', () => {
    /*
     * The button used to be a cog labelled `Open settings` while the popover held
     * nothing but the theme switch, so anyone hunting for page format or the title
     * page clicked here and concluded the app had none.
     */
    it('is labelled after what the popover actually contains', async () => {
        await mountMenu();

        expect(document.querySelector('button[aria-label="Open settings"]')).toBeNull();
    });

    /*
     * `Tooltip` wraps the button in a second react-aria trigger. Both providers
     * hand props to the same `Button`, so this guards that the menu still opens
     * rather than the tooltip quietly swallowing the press.
     */
    it('still opens the popover once wrapped in a tooltip', async () => {
        const trigger = await mountMenu();

        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        await userEvent.click(trigger);
        await waitForElement('[aria-label="Theme mode"]');

        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('names the button on hover as well', async () => {
        const trigger = await mountMenu();

        await userEvent.hover(trigger);

        const tooltip = await waitForElement('[role="tooltip"]');

        expect(tooltip.textContent).toBe('Appearance');
    });
});

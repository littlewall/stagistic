import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {Tooltip} from './Tooltip';

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

const mountTooltip = async (shortcut?: string) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(
        <Tooltip
            label="Bold"
            shortcut={shortcut}
        >
            <button type="button">Format</button>
        </Tooltip>,
    );

    return waitForElement<HTMLButtonElement>('button');
};

const warmPointerModality = async (trigger: HTMLButtonElement) => {
    await userEvent.click(trigger);
    await userEvent.unhover(trigger);
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('Tooltip shortcut', () => {
    it('shows the shortcut on the label line as a readable keycap', async () => {
        const trigger = await mountTooltip('⌘B');

        await warmPointerModality(trigger);
        await userEvent.hover(trigger);

        const tooltip = await waitForElement('[role="tooltip"]');
        const label = tooltip.querySelector('span span');
        const shortcut = tooltip.querySelector('kbd');

        expect(tooltip.textContent).toBe('Bold⌘B');
        expect(shortcut?.textContent).toBe('⌘B');

        const shortcutBox = shortcut!.getBoundingClientRect();
        const labelBox = label!.getBoundingClientRect();
        const middle = (box: DOMRect) => box.top + box.height / 2;

        expect(shortcutBox.left).toBeGreaterThan(labelBox.right);
        expect(Math.abs(middle(shortcutBox) - middle(labelBox))).toBeLessThanOrEqual(1);
        expect(getComputedStyle(shortcut!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    it('keeps a tooltip without a shortcut unchanged', async () => {
        const trigger = await mountTooltip();

        await warmPointerModality(trigger);
        await userEvent.hover(trigger);

        const tooltip = await waitForElement('[role="tooltip"]');

        expect(tooltip.textContent).toBe('Bold');
        expect(tooltip.querySelector('kbd')).toBeNull();
    });
});

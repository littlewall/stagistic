import '../../styles/tokens.css';

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
        <Tooltip label="Bold" shortcut={shortcut}>
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
    it('shows the shortcut below the label', async () => {
        const trigger = await mountTooltip('⌘B');

        await warmPointerModality(trigger);
        await userEvent.hover(trigger);

        const tooltip = await waitForElement('[role="tooltip"]');
        const label = tooltip.querySelector('span span');
        const shortcut = tooltip.querySelector('kbd');

        expect(tooltip.textContent).toBe('Bold⌘B');
        expect(shortcut?.textContent).toBe('⌘B');
        expect(shortcut?.getBoundingClientRect().top)
            .toBeGreaterThanOrEqual(label?.getBoundingClientRect().bottom ?? Infinity);
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

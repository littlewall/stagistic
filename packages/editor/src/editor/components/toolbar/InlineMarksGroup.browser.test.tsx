import '@stagistic/ui/styles/base.css';

import {isApplePlatform} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {InlineMarksGroup} from './InlineMarksGroup';

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

const waitForTooltipText = async (text: string): Promise<HTMLElement> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const tooltip = document.querySelector<HTMLElement>('[role="tooltip"]');

        if (tooltip?.textContent === text) {
            return tooltip;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected tooltip text ${text}`);
};

const mountGroup = async () => {
    const host = document.createElement('div');
    const noop = () => undefined;

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(
        <InlineMarksGroup
            state={{
                canUndo: true,
                canRedo: true,
                isBoldActive: false,
                isItalicActive: false,
                isUnderlineActive: false,
            }}
            actions={{
                onUndoMouseDown: noop,
                onRedoMouseDown: noop,
                onBoldMouseDown: noop,
                onItalicMouseDown: noop,
                onUnderlineMouseDown: noop,
            }}
        />,
    );

    return waitForElement<HTMLButtonElement>('button[aria-label="Undo"]');
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('InlineMarksGroup shortcut tooltips', () => {
    it('shows the existing shortcut for every toolbar action', async () => {
        const undoButton = await mountGroup();
        const cases = isApplePlatform()
            ? [
                ['Undo', '⌘Z'],
                ['Redo', '⇧⌘Z'],
                ['Bold', '⌘B'],
                ['Italic', '⌘I'],
                ['Underline', '⌘U'],
            ] as const
            : [
                ['Undo', 'Ctrl+Z'],
                ['Redo', 'Ctrl+Y'],
                ['Bold', 'Ctrl+B'],
                ['Italic', 'Ctrl+I'],
                ['Underline', 'Ctrl+U'],
            ] as const;

        await userEvent.click(undoButton);
        await userEvent.unhover(undoButton);

        for (const [label, shortcut] of cases) {
            const button = await waitForElement<HTMLButtonElement>(
                `button[aria-label="${label}"]`,
            );

            await userEvent.hover(button);

            const tooltip = await waitForTooltipText(`${label}${shortcut}`);

            expect(tooltip.querySelector('kbd')?.textContent).toBe(shortcut);
            await userEvent.unhover(button);
        }
    });
});

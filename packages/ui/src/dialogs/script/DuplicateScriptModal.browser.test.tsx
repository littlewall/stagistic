import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {DuplicateScriptModal, type DuplicateScriptSubmit} from './DuplicateScriptModal';

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

const renderModal = (onSubmit: (values: DuplicateScriptSubmit) => void) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    const render = (initialTitle = 'Hamlet - copy') => {
        root.render(
            <DuplicateScriptModal
                isOpen
                initialTitle={initialTitle}
                onClose={() => {}}
                onSubmit={onSubmit}
            />,
        );
    };

    render();
    mountedRoots.push(root);

    return {render};
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('DuplicateScriptModal', () => {
    it('focuses and selects the title when opened', async () => {
        renderModal(vi.fn());

        const title = await waitForElement<HTMLInputElement>('#duplicate-script-title');

        await expect.poll(() => document.activeElement).toBe(title);
        await expect.poll(() => [title.selectionStart, title.selectionEnd]).toEqual([0, title.value.length]);
    });

    it('keeps focus on the open-in-editor checkbox when title metadata refreshes', async () => {
        const modal = renderModal(vi.fn());
        const title = await waitForElement<HTMLInputElement>('#duplicate-script-title');
        const checkbox = await waitForElement<HTMLInputElement>('input[type="checkbox"]:not([role])');

        await expect.poll(() => document.activeElement).toBe(title);
        checkbox.focus();
        expect(document.activeElement).toBe(checkbox);

        modal.render('Refreshed - copy');
        await expect.poll(() => title.value).toBe('Refreshed - copy');
        await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

        expect(document.activeElement).toBe(checkbox);
    });

    it('pre-fills the copy title and defaults every switch off', async () => {
        const onSubmit = vi.fn();

        renderModal(onSubmit);

        const title = await waitForElement<HTMLInputElement>('#duplicate-script-title');

        expect(title.value).toBe('Hamlet - copy');

        const save = page.elementLocator(await waitForElement('button[type="submit"]'));

        await save.click();

        expect(onSubmit).toHaveBeenCalledWith({
            title: 'Hamlet - copy',
            copySettings: false,
            copyAttributes: false,
            openInEditor: false,
        });
    });

    it('submits the toggled switches and checkbox', async () => {
        const onSubmit = vi.fn();

        renderModal(onSubmit);

        await waitForElement('#duplicate-script-title');

        /*
         * react-aria renders the switch input inside a <label>; the visible track
         * intercepts pointer events, so click the wrapping label instead.
         */
        const switchInputs = Array.from(document.querySelectorAll<HTMLInputElement>('[role="switch"]'));
        const switchLabels = switchInputs.map(input => requireValue(input.closest('label')));

        await page.elementLocator(switchLabels[0]).click();
        await page.elementLocator(switchLabels[1]).click();

        const checkbox = page.elementLocator(await waitForElement('input[type="checkbox"]:not([role])'));

        await checkbox.click();

        const save = page.elementLocator(await waitForElement('button[type="submit"]'));

        await save.click();

        expect(onSubmit).toHaveBeenCalledWith({
            title: 'Hamlet - copy',
            copySettings: true,
            copyAttributes: true,
            openInEditor: true,
        });
    });

    it('disables save when the title is emptied', async () => {
        renderModal(vi.fn());

        const title = page.elementLocator(await waitForElement('#duplicate-script-title'));
        const save = await waitForElement<HTMLButtonElement>('button[type="submit"]');

        await title.fill('');
        expect(save.disabled).toBe(true);
    });
});

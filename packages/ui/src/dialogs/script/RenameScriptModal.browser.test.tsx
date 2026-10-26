import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {RenameScriptModal, type RenameScriptSubmit} from './RenameScriptModal';

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

const renderModal = (onSubmit: (values: RenameScriptSubmit) => void, onClose = () => {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    const render = (initialTitle = 'Old Title', initialSubtitle = 'Old Subtitle') => {
        root.render(
            <RenameScriptModal
                isOpen
                initialTitle={initialTitle}
                initialSubtitle={initialSubtitle}
                onClose={onClose}
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

describe('RenameScriptModal', () => {
    it('focuses and selects the title when opened', async () => {
        renderModal(vi.fn());

        const title = await waitForElement<HTMLInputElement>('#rename-script-title');

        await expect.poll(() => document.activeElement).toBe(title);
        await expect.poll(() => [title.selectionStart, title.selectionEnd]).toEqual([0, title.value.length]);
    });

    it('keeps focus in the subtitle when title metadata refreshes', async () => {
        const modal = renderModal(vi.fn());
        const title = await waitForElement<HTMLInputElement>('#rename-script-title');
        const subtitle = await waitForElement<HTMLInputElement>('#rename-script-subtitle');

        await expect.poll(() => document.activeElement).toBe(title);
        await page.elementLocator(subtitle).click();

        modal.render('Refreshed Title');
        await expect.poll(() => title.value).toBe('Refreshed Title');
        await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

        expect(document.activeElement).toBe(subtitle);
    });

    it('pre-fills the current title and subtitle', async () => {
        renderModal(vi.fn());

        const title = await waitForElement<HTMLInputElement>('#rename-script-title');
        const subtitle = await waitForElement<HTMLInputElement>('#rename-script-subtitle');

        expect(title.value).toBe('Old Title');
        expect(subtitle.value).toBe('Old Subtitle');
    });

    it('submits the edited title and subtitle', async () => {
        const onSubmit = vi.fn();

        renderModal(onSubmit);

        const title = page.elementLocator(await waitForElement('#rename-script-title'));
        const subtitle = page.elementLocator(await waitForElement('#rename-script-subtitle'));

        await title.fill('New Title');
        await subtitle.fill('New Subtitle');

        const save = page.elementLocator(await waitForElement('button[type="submit"]'));

        await save.click();

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith({title: 'New Title', subtitle: 'New Subtitle'});
    });

    it('disables save when the title is emptied', async () => {
        const onSubmit = vi.fn();

        renderModal(onSubmit);

        const title = page.elementLocator(await waitForElement('#rename-script-title'));
        const save = await waitForElement<HTMLButtonElement>('button[type="submit"]');

        await title.fill('');
        expect(save.disabled).toBe(true);
    });
});

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {EditorSidebar} from './EditorSidebar';
import type {EditorSidebarCharacter} from './types';

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

const findButtonByText = (label: string): HTMLButtonElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(candidate => candidate.textContent?.trim() === label);

    if (!button) {
        throw new Error(`Expected a button labelled ${label}`);
    }

    return button;
};

const confirmedCharacter: EditorSidebarCharacter = {
    id: 'char-1',
    key: 'ANNA',
    color: '#8899aa',
    isConfirmed: true,
    outline: null,
};

const renderSidebar = (
    onDeleteCharacter = vi.fn(),
    activeCharacterId?: string,
) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <EditorSidebar
            data={{
                confirmedCharacters: [confirmedCharacter],
                unconfirmedCharacters: [],
            }}
            actions={{onDeleteCharacter}}
            options={{activeCharacterId}}
        />,
    );
    mountedRoots.push(root);

    return {onDeleteCharacter};
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('EditorSidebar delete confirmation', () => {
    it('marks the matching character as active', async () => {
        renderSidebar(undefined, 'char-1');

        const activeRow = await waitForElement('[aria-current="true"]');

        expect(activeRow.textContent).toContain('ANNA');
    });

    it('reveals the delete button only once a character is expanded', async () => {
        renderSidebar();

        await waitForElement('[aria-label="Expand ANNA"]');

        expect(document.querySelector('[aria-label="Remove ANNA"]')).toBeNull();

        const row = page.elementLocator(await waitForElement('[aria-label="Expand ANNA"]'));

        await row.click();

        await waitForElement('[aria-label="Remove ANNA"]');
    });

    it('deletes only after confirming in the modal', async () => {
        const {onDeleteCharacter} = renderSidebar();

        const row = page.elementLocator(await waitForElement('[aria-label="Expand ANNA"]'));

        await row.click();

        const deleteButton = page.elementLocator(await waitForElement('[aria-label="Remove ANNA"]'));

        await deleteButton.click();

        // Modal is open; deletion has not fired yet.
        await waitForElement('dialog[aria-label="Remove character"]');
        expect(onDeleteCharacter).not.toHaveBeenCalled();

        const confirm = page.elementLocator(findButtonByText('Remove'));

        await confirm.click();

        expect(onDeleteCharacter).toHaveBeenCalledWith('char-1');
    });

    it('does not delete when the modal is cancelled', async () => {
        const {onDeleteCharacter} = renderSidebar();

        const row = page.elementLocator(await waitForElement('[aria-label="Expand ANNA"]'));

        await row.click();

        const deleteButton = page.elementLocator(await waitForElement('[aria-label="Remove ANNA"]'));

        await deleteButton.click();

        await waitForElement('dialog[aria-label="Remove character"]');

        const cancel = page.elementLocator(findButtonByText('Cancel'));

        await cancel.click();

        expect(onDeleteCharacter).not.toHaveBeenCalled();
    });
});

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

const confirmedCharacter: EditorSidebarCharacter = {
    id: 'char-1',
    key: 'ANNA',
    color: '#8899aa',
    isConfirmed: true,
    outline: null,
};

const renderSidebar = (
    onEditCharacter = vi.fn(),
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
            actions={{onEditCharacter}}
            options={{activeCharacterId}}
        />,
    );
    mountedRoots.push(root);

    return {onEditCharacter};
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('EditorSidebar character rows', () => {
    it('marks the matching character as active', async () => {
        renderSidebar(undefined, 'char-1');

        const activeRow = await waitForElement('[aria-current="true"]');

        expect(activeRow.textContent).toContain('ANNA');
    });

    it('renders confirmed characters as static rows with a manage action', async () => {
        renderSidebar();

        await waitForElement('[aria-label="Manage ANNA"]');
        expect(document.querySelector('[aria-label="Expand ANNA"]')).toBeNull();
        expect(document.querySelector('[aria-label="Remove ANNA"]')).toBeNull();
    });

    it('opens the selected character manager', async () => {
        const {onEditCharacter} = renderSidebar();
        const editButton = page.elementLocator(await waitForElement('[aria-label="Manage ANNA"]'));

        await editButton.click();

        expect(onEditCharacter).toHaveBeenCalledWith('char-1');
    });

    it('places the pending confirmation action at the far right', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [],
                    unconfirmedCharacters: [
                        {
                            key: 'BORIS',
                            color: '#aa9988',
                            isConfirmed: false,
                        },
                    ],
                }}
                actions={{onConfirmCharacter: vi.fn()}}
            />,
        );
        mountedRoots.push(root);

        const confirmButton = await waitForElement<HTMLButtonElement>('[aria-label="Confirm BORIS"]');
        const row = confirmButton.closest('div');

        expect(row?.lastElementChild).toBe(confirmButton);
        expect(row?.firstElementChild?.className).toContain('characterColorOutline');
    });
});

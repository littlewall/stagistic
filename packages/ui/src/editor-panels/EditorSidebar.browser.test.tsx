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

const waitForElementIn = async <T extends Element>(
    host: HTMLElement,
    selector: string,
): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = host.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected host element matching ${selector}`);
};

const confirmedCharacter: EditorSidebarCharacter = {
    id: 'char-1',
    key: 'ANNA',
    color: '#8899aa',
    isConfirmed: true,
    outline: null,
};

const emptyGroup = {
    id: 'group-1',
    key: 'ALL',
    color: '#9988aa',
    colorHex: '#9988aa',
    isConfirmed: true,
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
                groups: [],
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

    it('persists a confirmed character color through the shared picker', async () => {
        const onSetCharacterColor = vi.fn();
        const host = document.createElement('div');
        const root = createRoot(host);

        host.style.setProperty('--size-scale', '1');
        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [confirmedCharacter],
                    groups: [],
                    unconfirmedCharacters: [],
                }}
                actions={{onSetCharacterColor}}
            />,
        );
        mountedRoots.push(root);

        await page.elementLocator(
            await waitForElement('[aria-label="Choose color for ANNA"]'),
        ).click();
        await waitForElement('[aria-label="Color picker for ANNA"]');

        const applyButton = Array.from(document.querySelectorAll('button'))
            .find(button => button.textContent?.trim() === 'Apply');

        if (!applyButton) {
            throw new Error('Expected the color picker apply button');
        }

        await page.elementLocator(applyButton).click();

        expect(onSetCharacterColor).toHaveBeenCalledWith('char-1', expect.any(String));
    });

    it('renders the resolved character color instead of its stored color', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [
                        {
                            ...confirmedCharacter,
                            color: '#BBAA99',
                            colorHex: '#112233',
                        },
                    ],
                    groups: [],
                    unconfirmedCharacters: [],
                }}
                actions={{onSetCharacterColor: vi.fn()}}
            />,
        );
        mountedRoots.push(root);

        const colorTrigger = await waitForElement<HTMLElement>('[aria-label="Choose color for ANNA"]');

        expect(colorTrigger.style.getPropertyValue('--character-color')).toBe('#BBAA99');
    });

    it('places the pending confirmation action at the far right', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [],
                    groups: [],
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

describe('EditorSidebar group rows', () => {
    const renderGroups = (actions = {}) => {
        const host = document.createElement('div');
        const root = createRoot(host);

        host.style.setProperty('--size-scale', '1');
        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [confirmedCharacter],
                    groups: [emptyGroup],
                    unconfirmedCharacters: [
                        {
                            key: 'BORIS',
                            color: '#aa9988',
                            isConfirmed: false,
                        },
                    ],
                }}
                actions={actions}
            />,
        );
        mountedRoots.push(root);
    };

    it('orders confirmed characters, groups, then unconfirmed characters', async () => {
        renderGroups();

        await waitForElement('[aria-label="Manage group ALL"]');

        const sidebarText = document.querySelector('aside')?.textContent ?? '';

        expect(sidebarText.indexOf('ANNA')).toBeLessThan(sidebarText.indexOf('Groups'));
        expect(sidebarText.indexOf('Groups')).toBeLessThan(sidebarText.indexOf('ALL'));
        expect(sidebarText.indexOf('ALL')).toBeLessThan(sidebarText.indexOf('BORIS'));
    });

    it('shows a conditional Groups heading without an empty-state tag', async () => {
        renderGroups();

        await waitForElement('[aria-label="Manage group ALL"]');

        expect(document.querySelector('aside')?.textContent).toContain('Groups');
        expect(document.querySelector('aside')?.textContent).not.toContain('Empty');
        expect(Array.from(document.querySelectorAll('h2')).map(heading => heading.textContent))
            .toEqual(['Groups', 'Unconfirmed']);
        expect(getComputedStyle(document.querySelector('h2')!).fontWeight).toBe('400');

        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [confirmedCharacter],
                    groups: [],
                    unconfirmedCharacters: [],
                }}
            />,
        );
        mountedRoots.push(root);

        await waitForElementIn(host, '[aria-label="Manage ANNA"]');

        expect(Array.from(host.querySelectorAll('h2')).some(heading => heading.textContent === 'Groups')).toBe(false);
    });

    it('manages groups without a first occurrence action', async () => {
        const onFocusCharacter = vi.fn();
        const onEditGroup = vi.fn();

        renderGroups({onFocusCharacter, onEditGroup});

        await page.elementLocator(await waitForElement('[aria-label="Manage group ALL"]')).click();

        expect(document.querySelector('[aria-label="Focus ALL"]')).toBeNull();
        expect(onFocusCharacter).not.toHaveBeenCalled();
        expect(onEditGroup).toHaveBeenCalledWith('group-1');
    });

    it('persists a group color through the shared picker', async () => {
        const onSetGroupColor = vi.fn();

        renderGroups({onSetGroupColor});

        await page.elementLocator(
            await waitForElement('[aria-label="Choose color for ALL"]'),
        ).click();
        await waitForElement('[aria-label="Color picker for ALL"]');

        const applyButton = Array.from(document.querySelectorAll('button'))
            .find(button => button.textContent?.trim() === 'Apply');

        if (!applyButton) {
            throw new Error('Expected the color picker apply button');
        }

        await page.elementLocator(applyButton).click();

        expect(onSetGroupColor).toHaveBeenCalledWith('group-1', expect.any(String));
    });

    it('renders the resolved group color instead of its stored color', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [],
                    groups: [
                        {
                            ...emptyGroup,
                            color: '#CCBBAA',
                            colorHex: '#223344',
                        },
                    ],
                    unconfirmedCharacters: [],
                }}
                actions={{onSetGroupColor: vi.fn()}}
            />,
        );
        mountedRoots.push(root);

        const colorTrigger = await waitForElement<HTMLElement>('[aria-label="Choose color for ALL"]');

        expect(colorTrigger.style.getPropertyValue('--character-color')).toBe('#CCBBAA');
    });

    it('treats an existing group as sidebar content', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <EditorSidebar
                data={{
                    confirmedCharacters: [],
                    groups: [emptyGroup],
                    unconfirmedCharacters: [],
                }}
            />,
        );
        mountedRoots.push(root);

        await waitForElement('[aria-label="Manage group ALL"]');

        expect(host.textContent).not.toContain('No characters on stage yet');
    });
});

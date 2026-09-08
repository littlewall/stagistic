import type {
    ComponentProps,
    ComponentType,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {AttributeManagerCharactersPanel} from './AttributeManagerCharactersPanel';

type RenameableCharactersPanelProps = Omit<
    ComponentProps<typeof AttributeManagerCharactersPanel>,
    'characters'
> & {
    characters: Array<ComponentProps<typeof AttributeManagerCharactersPanel>['characters'][number] & {
        groupNames?: string[],
    }>,
    draftScopeKey?: string | null,
    renamingCharacterIds?: string[],
    groups?: Array<{
        id: string,
        name: string,
        color: string | null,
        memberIds: string[],
        usageCount: number,
    }>,
    onRenameGroup?: (
        groupId: string,
        previousName: string,
        nextName: string,
    ) => void | Promise<unknown>,
    onRenameCharacter?: (
        characterId: string,
        previousName: string,
        nextName: string,
    ) => void | Promise<unknown>,
};

const RenameableCharactersPanel = AttributeManagerCharactersPanel as ComponentType<RenameableCharactersPanelProps>;
const roots: Root[] = [];

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

const renderPanel = (
    onRenameCharacter = vi.fn(() => Promise.resolve()),
    groups: RenameableCharactersPanelProps['groups'] = [],
    onRenameGroup = vi.fn(() => Promise.resolve()),
) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    host.style.width = '900px';
    host.style.height = '600px';
    document.body.appendChild(host);
    root.render(
        <RenameableCharactersPanel
            characters={[
                {
                    id: 'char-1', name: 'ANNA', color: null, outline: null, groupNames: ['ALL', 'ENSEMBLE'],
                }, {
                    id: 'char-2', name: 'BORIS', color: null, outline: null,
                },
            ]}
            groups={groups}
            draftScopeKey="script-1"
            onSetCharacterColor={() => undefined}
            onDeleteCharacter={() => undefined}
            onCreateCharacter={() => undefined}
            onRenameCharacter={onRenameCharacter}
            onRenameGroup={onRenameGroup}
        />,
    );
    roots.push(root);

    return {
        onRenameCharacter,
        onRenameGroup,
    };
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('AttributeManagerCharactersPanel rename', () => {
    it('reflects the name draft and persists it on blur', async () => {
        const {onRenameCharacter} = renderPanel();
        const input = await waitForElement<HTMLInputElement>('#character-name-char-1');

        await page.elementLocator(input).fill('Alice');

        expect(document.querySelector('[aria-label="Characters list"]')?.textContent).toContain('Alice');
        expect(document.querySelector('[aria-label="Characters detail"] h3')?.textContent).toBe('Alice');

        input.blur();

        expect(onRenameCharacter).toHaveBeenCalledWith('char-1', 'ANNA', 'Alice');
    });

    it('restores the confirmed name on Escape', async () => {
        renderPanel();

        const input = await waitForElement<HTMLInputElement>('#character-name-char-1');
        const locator = page.elementLocator(input);

        await locator.fill('Alice');
        await userEvent.keyboard('{Escape}');

        expect(input.value).toBe('ANNA');
        expect(document.querySelector('[aria-label="Characters list"]')?.textContent).toContain('ANNA');
    });

    it('rejects a duplicate character name', async () => {
        const {onRenameCharacter} = renderPanel();
        const input = await waitForElement<HTMLInputElement>('#character-name-char-1');

        await page.elementLocator(input).fill('BORIS (V.O.)');
        input.blur();

        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(document.body.textContent).toContain('A character or group with this name already exists.');
        expect(onRenameCharacter).not.toHaveBeenCalled();
    });

    it('keeps the dirty draft when persistence fails', async () => {
        const onRenameCharacter = vi.fn(() => Promise.reject(new Error('write failed')));

        renderPanel(onRenameCharacter);

        const input = await waitForElement<HTMLInputElement>('#character-name-char-1');

        await page.elementLocator(input).fill('Alice');
        input.blur();
        await new Promise(resolve => window.setTimeout(resolve, 20));

        expect(input.value).toBe('Alice');
    });

    it('keeps a confirmed name reserved for creation after a failed rename', async () => {
        const onRenameCharacter = vi.fn(() => Promise.reject(new Error('write failed')));

        renderPanel(onRenameCharacter);

        const renameInput = await waitForElement<HTMLInputElement>('#character-name-char-1');

        await page.elementLocator(renameInput).fill('Alice');
        renameInput.blur();
        await new Promise(resolve => window.setTimeout(resolve, 20));
        await page.elementLocator(await waitForElement('[aria-label="Create characters"]')).click();

        const createInput = await waitForElement<HTMLInputElement>('#create-character-name');

        await page.elementLocator(createInput).fill('Anna');

        expect(createInput.getAttribute('aria-invalid')).toBe('true');
        expect(createInput.parentElement?.nextElementSibling?.textContent).toBe(
            'A character or group with this name already exists.',
        );
    });

    it('keeps a confirmed name reserved for other renames after a failed rename', async () => {
        const onRenameCharacter = vi.fn(() => Promise.reject(new Error('write failed')));

        renderPanel(onRenameCharacter);

        const firstInput = await waitForElement<HTMLInputElement>('#character-name-char-1');

        await page.elementLocator(firstInput).fill('Alice');
        firstInput.blur();
        await new Promise(resolve => window.setTimeout(resolve, 20));
        await page.elementLocator(
            Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label="Characters list"] button'))
                .find(button => button.textContent?.includes('BORIS'))!,
        ).click();

        const secondInput = await waitForElement<HTMLInputElement>('#character-name-char-2');

        await page.elementLocator(secondInput).fill('Anna');
        secondInput.blur();

        expect(secondInput.getAttribute('aria-invalid')).toBe('true');
        expect(secondInput.parentElement?.querySelector('[id^="character-name-error"]')?.textContent).toBe(
            'A character or group with this name already exists.',
        );
        expect(onRenameCharacter).toHaveBeenCalledTimes(1);
    });

    it('rejects a character name that duplicates a group', async () => {
        const {onRenameCharacter} = renderPanel(
            undefined,
            [{
                id: 'group-1',
                name: 'ENSEMBLE',
                color: null,
                memberIds: [],
                usageCount: 0,
            }],
        );
        const input = await waitForElement<HTMLInputElement>('#character-name-char-1');

        await page.elementLocator(input).fill('Ensemble');
        input.blur();

        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(document.body.textContent).toContain('A character or group with this name already exists.');
        expect(onRenameCharacter).not.toHaveBeenCalled();
    });

    it('rejects empty and cross-kind duplicate group names', async () => {
        const onRenameGroup = vi.fn(() => Promise.resolve());

        renderPanel(
            undefined,
            [{
                id: 'group-1',
                name: 'ALL',
                color: null,
                memberIds: [],
                usageCount: 0,
            }],
            onRenameGroup,
        );

        await page.elementLocator(await waitForElement('[role="tab"]:nth-child(2)')).click();

        const input = await waitForElement<HTMLInputElement>('#group-name-group-1');

        await page.elementLocator(input).fill('Anna');
        input.blur();
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(onRenameGroup).not.toHaveBeenCalled();

        await page.elementLocator(input).fill('   ');
        input.blur();
        expect(document.body.textContent).toContain('Name cannot be empty.');
        expect(onRenameGroup).not.toHaveBeenCalled();
    });

    it('lists every containing group before deleting a character', async () => {
        renderPanel();

        await page.elementLocator(await waitForElement('[aria-label="Remove ANNA"]')).click();

        expect(document.body.textContent).toContain(
            'ANNA belongs to ALL and ENSEMBLE. Deleting ANNA removes them from these groups.',
        );
    });
});

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

type RenameableCharactersPanelProps = ComponentProps<typeof AttributeManagerCharactersPanel> & {
    draftScopeKey?: string | null,
    renamingCharacterIds?: string[],
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
) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    host.style.width = '900px';
    host.style.height = '600px';
    host.style.setProperty('--size-scale', '1');
    document.body.appendChild(host);
    root.render(
        <RenameableCharactersPanel
            characters={[
                {
                    id: 'char-1', name: 'ANNA', color: null, outline: null,
                }, {
                    id: 'char-2', name: 'BORIS', color: null, outline: null,
                },
            ]}
            draftScopeKey="script-1"
            onSetCharacterColor={() => undefined}
            onDeleteCharacter={() => undefined}
            onCreateCharacter={() => undefined}
            onRenameCharacter={onRenameCharacter}
        />,
    );
    roots.push(root);

    return {onRenameCharacter};
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
        expect(document.body.textContent).toContain('A character with this name already exists.');
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
});

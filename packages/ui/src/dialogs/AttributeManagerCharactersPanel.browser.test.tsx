import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {AttributeManagerCharactersPanel} from './AttributeManagerCharactersPanel';

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

const waitForVisibleElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = Array.from(document.querySelectorAll<T>(selector))
            .find(candidate => candidate.getClientRects().length > 0);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected a visible element matching ${selector}`);
};

const findVisibleButtonByText = (label: string): HTMLButtonElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(candidate => candidate.textContent?.trim() === label && candidate.getClientRects().length > 0);

    if (!button) {
        throw new Error(`Expected a visible button labelled ${label}`);
    }

    return button;
};

const renderPanel = (
    initialSelectedCharacterId?: string,
    onSetCharacterColor = vi.fn(),
) => {
    const host = document.createElement('div');
    const onSetCharacterOutline = vi.fn();
    const onDeleteCharacter = vi.fn();
    const onCreateCharacter = vi.fn();

    host.style.width = '900px';
    host.style.height = '600px';
    host.style.setProperty('--size-scale', '1');
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <AttributeManagerCharactersPanel
            characters={[
                {
                    id: 'char-1',
                    name: 'ANNA',
                    color: '#8899aa',
                    outline: 'existing outline',
                }, {
                    id: 'char-2',
                    name: 'BORIS',
                    color: '#aa9988',
                    outline: 'selected outline',
                },
            ]}
            initialSelectedCharacterId={initialSelectedCharacterId}
            onSetCharacterColor={onSetCharacterColor}
            onSetCharacterOutline={onSetCharacterOutline}
            onDeleteCharacter={onDeleteCharacter}
            onCreateCharacter={onCreateCharacter}
        />,
    );
    mountedRoots.push(root);

    return {
        onSetCharacterColor,
        onSetCharacterOutline,
        onDeleteCharacter,
        onCreateCharacter,
    };
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AttributeManagerCharactersPanel character actions', () => {
    it('opens with the requested character selected', async () => {
        renderPanel('char-2');

        await waitForElement('[aria-label="Outline for BORIS"]');

        expect(document.querySelector('[aria-label="Outline for ANNA"]')).toBeNull();
    });

    it('applies a character color through the shared picker', async () => {
        const {onSetCharacterColor} = renderPanel();
        const colorButton = page.elementLocator(
            await waitForElement('[aria-label="Choose color for ANNA"]'),
        );

        await colorButton.click();
        await waitForElement('[aria-label="Color picker for ANNA"]');

        const applyButton = page.elementLocator(findButtonByText('Apply'));

        await applyButton.click();

        expect(onSetCharacterColor).toHaveBeenCalledWith('char-1', expect.any(String));
    });

    it('keeps the newest color visible while older persistence is still pending', async () => {
        const resolvers: Array<() => void> = [];
        const onSetCharacterColor = vi.fn((
            _characterId: string,
            _colorHex: string | null,
        ) => {
            void _characterId;
            void _colorHex;

            return new Promise<void>(resolve => {
                resolvers.push(resolve);
            });
        });

        renderPanel(undefined, onSetCharacterColor);

        const chooseColor = async (action: 'Apply' | 'Reset') => {
            await page.elementLocator(
                await waitForElement('[aria-label="Choose color for ANNA"]'),
            ).click();
            await waitForVisibleElement('[aria-label="Color picker for ANNA"]');
            await page.elementLocator(findVisibleButtonByText(action)).click();
        };

        await chooseColor('Reset');
        await chooseColor('Apply');

        const newestColor = onSetCharacterColor.mock.calls[1]?.[1];
        const listColor = findButtonByText('ANNA').querySelector<HTMLElement>('span');
        const expected = document.createElement('span');

        expected.style.backgroundColor = newestColor ?? '';
        resolvers[0]?.();
        await new Promise(resolve => window.setTimeout(resolve, 0));

        expect(listColor?.style.backgroundColor).toBe(expected.style.backgroundColor);

        resolvers[1]?.();
    });

    it('deletes only after confirming in the modal', async () => {
        const {onDeleteCharacter} = renderPanel();
        const deleteButton = page.elementLocator(
            await waitForElement('[aria-label="Remove ANNA"]'),
        );

        await deleteButton.click();
        await waitForElement('dialog[aria-label="Remove character"]');
        expect(onDeleteCharacter).not.toHaveBeenCalled();

        const confirmButton = page.elementLocator(findButtonByText('Remove'));

        await confirmButton.click();

        expect(onDeleteCharacter).toHaveBeenCalledWith('char-1');
    });

    it('creates a confirmed character through the add button', async () => {
        const {onCreateCharacter} = renderPanel();
        const addButton = page.elementLocator(
            await waitForElement<HTMLButtonElement>('[aria-label="Create characters"]'),
        );

        expect(
            document.querySelector<HTMLButtonElement>('[aria-label="Create characters"]')?.disabled,
        ).toBe(false);

        await addButton.click();

        const nameInput = await waitForElement<HTMLInputElement>('#create-character-name');

        await page.elementLocator(nameInput).fill('Rebecca');

        const createButton = page.elementLocator(findButtonByText('Create character'));

        await createButton.click();

        expect(onCreateCharacter).toHaveBeenCalledWith('REBECCA');
    });

    it('persists the edited outline on blur', async () => {
        const {onSetCharacterOutline} = renderPanel();
        const inputElement = await waitForElement<HTMLInputElement>(
            '[aria-label="Outline for ANNA"]',
        );

        expect(inputElement.tagName).toBe('INPUT');

        const input = page.elementLocator(inputElement);

        expect(inputElement.value).toBe('existing outline');

        await input.fill('brooding rival');
        inputElement.blur();

        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', 'brooding rival');
    });

    it('does not repeat the character type above the selected name', async () => {
        renderPanel();

        const detailHeader = await waitForElement('[aria-label="Characters detail"] header');

        expect(detailHeader.textContent).toContain('ANNA');
        expect(detailHeader.textContent).not.toContain('Character');
    });
});

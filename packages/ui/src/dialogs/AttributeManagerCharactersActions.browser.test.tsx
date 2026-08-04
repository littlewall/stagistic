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

import {
    CHARACTERS,
    cleanupPanels,
    findButtonByText,
    findVisibleButtonByText,
    GROUPS,
    renderPanel,
    waitForElement,
    waitForVisibleElement,
} from './AttributeManagerCharactersPanel.browser.testUtils';

afterEach(cleanupPanels);

describe('AttributeManagerCharactersPanel character actions', () => {
    it('opens the groups workspace with the requested group selection', async () => {
        renderPanel(undefined, vi.fn(), CHARACTERS, 'groups', 'group-1');

        const groupsTab = await waitForElement<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
        const groupsDetail = document.querySelector('[aria-label="Groups detail"]');

        expect(groupsTab.textContent).toBe('Groups');
        expect(groupsDetail?.getAttribute('data-selected-group-id')).toBe('group-1');
    });

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
        await page.elementLocator(findButtonByText('Apply')).click();
        expect(onSetCharacterColor).toHaveBeenCalledWith('char-1', expect.any(String));
    });

    it('keeps the newest color visible while older persistence is still pending', async () => {
        const resolvers: Array<() => void> = [];
        const onSetCharacterColor = vi.fn((
            _characterId: string,
            _colorHex: string | null,
        ) => new Promise<void>(resolve => {
            resolvers.push(resolve);
        }));

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

    it('shows a null color reset while persistence is pending', async () => {
        let resolvePersistence: () => void = () => undefined;
        const onSetCharacterColor = vi.fn(() => new Promise<void>(resolve => {
            resolvePersistence = resolve;
        }));

        renderPanel(undefined, onSetCharacterColor);

        await page.elementLocator(
            await waitForElement('[aria-label="Choose color for ANNA"]'),
        ).click();
        await waitForVisibleElement('[aria-label="Color picker for ANNA"]');
        await page.elementLocator(findVisibleButtonByText('Reset')).click();

        const listColor = findButtonByText('ANNA').querySelector<HTMLElement>('span');

        expect(onSetCharacterColor).toHaveBeenCalledWith('char-1', null);
        expect(listColor?.style.backgroundColor).toBe('');
        resolvePersistence();
    });

    it('deletes only after confirming in the modal', async () => {
        const {onDeleteCharacter} = renderPanel();

        await page.elementLocator(await waitForElement('[aria-label="Remove ANNA"]')).click();
        await waitForElement('dialog[aria-label="Remove character"]');
        expect(onDeleteCharacter).not.toHaveBeenCalled();
        await page.elementLocator(findButtonByText('Remove')).click();
        expect(onDeleteCharacter).toHaveBeenCalledWith('char-1');
    });

    it('creates a confirmed character through the add button', async () => {
        const {onCreateCharacter} = renderPanel();

        await page.elementLocator(
            await waitForElement<HTMLButtonElement>('[aria-label="Create characters"]'),
        ).click();
        await page.elementLocator(
            await waitForElement<HTMLInputElement>('#create-character-name'),
        ).fill('Rebecca');
        await page.elementLocator(findButtonByText('Create character')).click();
        expect(onCreateCharacter).toHaveBeenCalledWith('REBECCA');
    });

    it('shows an adjacent accessible error after submitting an empty character name', async () => {
        const {onCreateCharacter} = renderPanel();

        await page.elementLocator(await waitForElement('[aria-label="Create characters"]')).click();
        const input = await waitForElement<HTMLInputElement>('#create-character-name');

        await page.elementLocator(input).fill('   ');
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard('{Tab}');

        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toBe('create-character-error');
        expect(input.parentElement?.nextElementSibling?.textContent).toBe('Name cannot be empty.');
        expect(onCreateCharacter).not.toHaveBeenCalled();
    });

    it('rejects a character name that duplicates a group', async () => {
        const {onCreateCharacter} = renderPanel(
            undefined,
            vi.fn(),
            CHARACTERS,
            'characters',
            undefined,
            GROUPS,
        );

        await page.elementLocator(await waitForElement('[aria-label="Create characters"]')).click();
        const input = await waitForElement<HTMLInputElement>('#create-character-name');

        await page.elementLocator(input).fill('All');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(onCreateCharacter).not.toHaveBeenCalled();
    });

    it('persists the edited outline on blur', async () => {
        const {onSetCharacterOutline} = renderPanel();
        const inputElement = await waitForElement<HTMLInputElement>('[aria-label="Outline for ANNA"]');
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

    it('separates an empty list status from the next action in the detail pane', async () => {
        renderPanel(undefined, vi.fn(), []);
        const list = await waitForElement('[aria-label="Characters list"]');
        const detail = await waitForElement('[aria-label="Characters detail"]');

        expect(list.textContent).toContain('No characters yet.');
        expect(detail.textContent).toContain('Create a character to edit details here.');
        expect(detail.textContent).not.toContain('No characters yet.');
    });
});

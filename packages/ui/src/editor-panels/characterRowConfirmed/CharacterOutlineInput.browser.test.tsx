import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import type {EditorSidebarCharacter} from '../types';
import {CharacterOutlineInput} from './CharacterOutlineInput';

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

const character: EditorSidebarCharacter = {
    id: 'char-1',
    key: 'ANNA',
    color: '#8899aa',
    isConfirmed: true,
    outline: 'existing outline',
};

const renderInput = (onSetCharacterOutline?: (characterId: string, outline: string | null) => void) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <CharacterOutlineInput
            character={character}
            onSetCharacterOutline={onSetCharacterOutline}
        />,
    );
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('CharacterOutlineInput', () => {
    it('renders the persisted outline', async () => {
        renderInput();

        const textarea = await waitForElement<HTMLTextAreaElement>('textarea');

        expect(textarea.value).toBe('existing outline');
        expect(textarea.placeholder).toBe('Outline');
    });

    it('persists the edited outline on blur', async () => {
        const onSetCharacterOutline = vi.fn();

        renderInput(onSetCharacterOutline);

        const textareaElement = await waitForElement<HTMLTextAreaElement>('textarea');

        await page.elementLocator(textareaElement).fill('brooding rival');
        textareaElement.blur();

        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', 'brooding rival');
    });

    it('persists null when the outline is cleared', async () => {
        const onSetCharacterOutline = vi.fn();

        renderInput(onSetCharacterOutline);

        const textareaElement = await waitForElement<HTMLTextAreaElement>('textarea');

        await page.elementLocator(textareaElement).fill('');
        textareaElement.blur();

        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', null);
    });
});

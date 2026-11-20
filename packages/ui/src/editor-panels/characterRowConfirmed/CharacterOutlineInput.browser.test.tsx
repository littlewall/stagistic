import {getUnsavedWorkParticipants, hasUnsavedWork} from '@stagistic/shared';
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

const renderInput = (onSetCharacterOutline?: (characterId: string, outline: string | null) => void | Promise<void>) => {
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

    it('counts as unsaved work until the outline is saved or the input is gone', async () => {
        renderInput(vi.fn());

        const textareaElement = await waitForElement<HTMLTextAreaElement>('textarea');

        expect(hasUnsavedWork()).toBe(false);
        await page.elementLocator(textareaElement).fill('brooding rival');
        expect(hasUnsavedWork()).toBe(true);

        mountedRoots.forEach(root => root.unmount());
        mountedRoots.length = 0;
        expect(hasUnsavedWork()).toBe(false);
    });

    it('takes part in a handover: flushes the pending debounce and offers its text', async () => {
        const onSetCharacterOutline = vi.fn();

        renderInput(onSetCharacterOutline);

        const textareaElement = await waitForElement<HTMLTextAreaElement>('textarea');
        const [participant] = getUnsavedWorkParticipants();

        expect(participant).toBeDefined();
        expect(participant?.getText?.()).toBe('');

        await page.elementLocator(textareaElement).fill('brooding rival');
        expect(onSetCharacterOutline).not.toHaveBeenCalled();
        expect(participant?.getText?.()).toContain('brooding rival');
        expect(participant?.getText?.()).toContain('ANNA');

        await expect(participant?.flush()).resolves.toBe(true);
        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', 'brooding rival');

        mountedRoots.forEach(root => root.unmount());
        mountedRoots.length = 0;
        expect(getUnsavedWorkParticipants()).toHaveLength(0);
    });

    it('flush resolves only after the outline write is persisted', async () => {
        let finishWrite: () => void = () => {};
        const onSetCharacterOutline = vi.fn(() => new Promise<void>(resolve => {
            finishWrite = resolve;
        }));

        renderInput(onSetCharacterOutline);

        const textareaElement = await waitForElement<HTMLTextAreaElement>('textarea');
        const [participant] = getUnsavedWorkParticipants();

        await page.elementLocator(textareaElement).fill('brooding rival');

        let settled = false;
        const flushed = participant?.flush().then(result => {
            settled = true;

            return result;
        });

        await new Promise(resolve => setTimeout(resolve, 50));
        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', 'brooding rival');
        expect(settled).toBe(false);

        finishWrite();
        await expect(flushed).resolves.toBe(true);
    });

    it('flush resolves false when the outline write fails', async () => {
        renderInput(vi.fn(() => Promise.reject(new Error('write failed'))));

        const textareaElement = await waitForElement<HTMLTextAreaElement>('textarea');
        const [participant] = getUnsavedWorkParticipants();

        await page.elementLocator(textareaElement).fill('brooding rival');
        await expect(participant?.flush()).resolves.toBe(false);
    });
});

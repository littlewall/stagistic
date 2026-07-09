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
import {CharacterRowDetails} from './CharacterRowDetails';
import type {CharacterRowDetailsProps} from './contracts';

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

const renderDetails = (overrides: Partial<CharacterRowDetailsProps['actions']> = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <CharacterRowDetails
            model={{character}}
            state={{isExpanded: true}}
            actions={{...overrides}}
        />,
    );
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('CharacterRowDetails outline', () => {
    it('renders the outline textarea seeded with the persisted value and no controls', async () => {
        renderDetails();

        const textarea = await waitForElement<HTMLTextAreaElement>('textarea');

        expect(textarea.value).toBe('existing outline');
        expect(textarea.placeholder).toBe('Outline');
        // The details area holds only the outline — no gender picker, no delete button.
        expect(document.querySelectorAll('button')).toHaveLength(0);
    });

    it('persists the edited outline on blur', async () => {
        const onSetCharacterOutline = vi.fn();

        renderDetails({onSetCharacterOutline});

        const textareaEl = await waitForElement<HTMLTextAreaElement>('textarea');
        const textarea = page.elementLocator(textareaEl);

        await textarea.fill('brooding rival');
        textareaEl.blur();

        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', 'brooding rival');
    });

    it('persists null when the outline is cleared', async () => {
        const onSetCharacterOutline = vi.fn();

        renderDetails({onSetCharacterOutline});

        const textareaEl = await waitForElement<HTMLTextAreaElement>('textarea');
        const textarea = page.elementLocator(textareaEl);

        await textarea.fill('');
        textareaEl.blur();

        expect(onSetCharacterOutline).toHaveBeenCalledWith('char-1', null);
    });
});

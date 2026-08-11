import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import ScriptEditor from '../../Editor';

const persistentCharacters = [
    {
        id: 'johny-id', key: 'Johny', colorHex: null,
    }, {
        id: 'josef-id', key: 'Josef', colorHex: null,
    },
];

const createStageDirectionDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'stage-direction-1'},
            content: [],
        },
    ],
});

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

const getOptionByName = (name: string) => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
    .find(element => element.textContent?.trim() === name) ?? null;

const waitForOption = async (name: string): Promise<HTMLElement> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const option = getOptionByName(name);

        if (option) {
            return option;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected option ${name}`);
};

const waitForGone = async (selector: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (!document.querySelector(selector)) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector} to be gone`);
};

const waitForAttribute = async (element: Element, attribute: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const value = element.getAttribute(attribute);

        if (value) {
            return value;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected ${attribute} to be set`);
};

const waitForAttributeGone = async (element: Element, attribute: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (!element.hasAttribute(attribute)) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected ${attribute} to be removed`);
};

const renderEditor = () => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue: createStageDirectionDocument(),
                persistentCharacters,
            }}
            layout={{autoFocus: true}}
        />,
    );

    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('character tag confirmation', () => {
    it('inserts a confirmed pill linked to the selected persistent character', async () => {
        renderEditor();

        const editor = page.elementLocator(await waitForElement('[contenteditable="true"]'));

        await editor.click();
        await userEvent.type(editor, '@');

        const option = await waitForOption('JOHNY');

        await page.elementLocator(option).click();

        const pill = await waitForElement<HTMLElement>('[data-character-id="johny-id"]');

        expect(pill.getAttribute('data-character-id')).toBe('johny-id');
        expect(pill.hasAttribute('data-character-key')).toBe(true);
    });

    it('closes the suggestion overlay on Escape', async () => {
        renderEditor();

        const editor = page.elementLocator(await waitForElement('[contenteditable="true"]'));

        await editor.click();
        await userEvent.type(editor, '@');
        await waitForElement('[role="listbox"][aria-label="Character suggestions"]');

        await userEvent.keyboard('{Escape}');

        await waitForGone('[role="listbox"][aria-label="Character suggestions"]');
    });

    it('exposes keyboard selection through the focused editor', async () => {
        renderEditor();

        const editorElement = await waitForElement<HTMLElement>('[contenteditable="true"]');
        const editor = page.elementLocator(editorElement);

        await editor.click();
        await userEvent.type(editor, '@');

        const listbox = await waitForElement<HTMLElement>('[role="listbox"][aria-label="Character suggestions"]');

        expect(editorElement.hasAttribute('aria-activedescendant')).toBe(false);

        await userEvent.keyboard('{ArrowDown}');

        const activeDescendantId = await waitForAttribute(editorElement, 'aria-activedescendant');
        const controlledListboxId = await waitForAttribute(editorElement, 'aria-controls');
        const activeOption = document.getElementById(activeDescendantId);

        expect(listbox.id).toBe(controlledListboxId);
        expect(activeOption?.getAttribute('role')).toBe('option');
        expect(activeOption?.getAttribute('aria-selected')).toBe('true');

        await userEvent.keyboard('{Escape}');
        await waitForGone('[role="listbox"][aria-label="Character suggestions"]');
        await waitForAttributeGone(editorElement, 'aria-activedescendant');
        await waitForAttributeGone(editorElement, 'aria-controls');

        expect(editorElement.hasAttribute('aria-activedescendant')).toBe(false);
        expect(editorElement.hasAttribute('aria-controls')).toBe(false);
    });
});

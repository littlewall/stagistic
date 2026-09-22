import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../../context';
import ScriptEditor from '../../../Editor';
import {findScriptBlockByIdFromState} from '../../scriptCore';
import {getSceneCollapseSnapshot} from '../sceneCollapse/SceneCollapseExtension';

type SearchTestWindow = Window & {__editorSearchTestEditor?: Editor | null};

const block = (type: ScriptNode['type'], id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

const searchFixture = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('scene', 'scene-1', 'FIRST'),
        block('dialogue', 'dialogue-1', 'Light the lantern.'),
        block('dialogue', 'dialogue-2', 'A light remains. LIGHT fades.'),
    ],
});

const collapsedSearchFixture = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('scene', 'scene-1', 'OPEN'),
        block('dialogue', 'dialogue-1', 'An open light.'),
        block('scene', 'scene-2', 'HIDDEN'),
        block('dialogue', 'dialogue-2', 'The hidden light remains.'),
    ],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SearchTestWindow).__editorSearchTestEditor = editor;

        return () => {
            delete (window as SearchTestWindow).__editorSearchTestEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = (initialValue: ScriptDocument = searchFixture()) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor document={{initialValue}} layout={{autoFocus: true}}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );

    mountedRoots.push(root);
};

const poll = async <T,>(get: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = get();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => poll(() => (window as SearchTestWindow).__editorSearchTestEditor ?? null, 'editor instance');

const findSearchInput = () => poll(() => document.querySelector<HTMLInputElement>('input[aria-label="Search script"]'), 'search input');

const resultText = () =>
    poll(() => document.querySelector<HTMLOutputElement>('output[aria-label="Search result position"]')?.textContent, 'search result position');

const waitForResult = (expected: string) =>
    poll(
        () => (document.querySelector<HTMLOutputElement>('output[aria-label="Search result position"]')?.textContent === expected ? expected : null),
        `search result position ${expected}`,
    );

const platformModKey = () => (navigator.platform.toLowerCase().includes('mac') ? 'Meta' : 'Control');

const setSearchQuery = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    if (!descriptor?.set) {
        throw new Error('Expected the native input value setter');
    }

    descriptor.set.call(input, value);
    input.dispatchEvent(
        new InputEvent('input', {
            bubbles: true,
            data: value,
            inputType: 'insertText',
        }),
    );
};

const pressEnter = (input: HTMLInputElement, options: {shiftKey?: boolean; isComposing?: boolean} = {}) => {
    input.dispatchEvent(
        new KeyboardEvent('keydown', {
            key: 'Enter',
            shiftKey: options.shiftKey,
            isComposing: options.isComposing,
            bubbles: true,
            cancelable: true,
        }),
    );
};

const pressFindShortcut = (target: EventTarget = window) => {
    const key = platformModKey();
    const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: key === 'Control',
        metaKey: key === 'Meta',
        bubbles: true,
        cancelable: true,
    });

    target.dispatchEvent(event);

    return event;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('editor search', () => {
    it('searches instantly and navigates while retaining input focus and editor selection', async () => {
        renderEditor();
        const editor = await getEditor();
        const input = await findSearchInput();
        const selectionBefore = editor.state.selection.from;

        input.focus();
        setSearchQuery(input, 'LIGHT');

        expect(await resultText()).toBe('1 / 3');
        expect(document.activeElement).toBe(input);

        pressEnter(input);

        expect(await waitForResult('2 / 3')).toBe('2 / 3');
        expect(document.activeElement).toBe(input);
        expect(editor.state.selection.from).toBe(selectionBefore);

        pressEnter(input, {shiftKey: true});

        expect(await waitForResult('1 / 3')).toBe('1 / 3');
    });

    it('does not navigate on composing Enter', async () => {
        renderEditor();
        const input = await findSearchInput();

        setSearchQuery(input, 'light');
        pressEnter(input, {isComposing: true});

        expect(await resultText()).toBe('1 / 3');
    });

    it('shows zero results, disables navigation, and restores the search icon on clear', async () => {
        renderEditor();
        const input = await findSearchInput();

        setSearchQuery(input, 'missing');

        expect(await resultText()).toBe('0 / 0');
        expect(document.querySelector<HTMLButtonElement>('button[aria-label="Previous search result"]')?.disabled).toBe(true);
        expect(document.querySelector<HTMLButtonElement>('button[aria-label="Next search result"]')?.disabled).toBe(true);

        document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]')?.click();

        await poll(() => (input.value === '' ? true : null), 'cleared search input');

        expect(input.value).toBe('');
        expect(document.querySelector('output[aria-label="Search result position"]')).toBeNull();
    });

    it('wraps button navigation between the last and first results', async () => {
        renderEditor();
        const input = await findSearchInput();

        setSearchQuery(input, 'light');

        const previous = document.querySelector<HTMLButtonElement>('button[aria-label="Previous search result"]')!;

        previous.click();

        expect(await waitForResult('3 / 3')).toBe('3 / 3');
    });

    it('focuses and selects search through the find shortcut without stealing it from other inputs', async () => {
        renderEditor();
        const editor = await getEditor();
        const input = await findSearchInput();
        const secondBlock = findScriptBlockByIdFromState(editor.state, 'dialogue-2');

        if (!secondBlock) {
            throw new Error('Expected second dialogue block');
        }

        editor.commands.setTextSelection(secondBlock.from + 1);
        setSearchQuery(input, 'light');
        expect(pressFindShortcut(input).defaultPrevented).toBe(true);

        expect(document.activeElement).toBe(input);
        expect(input.selectionStart).toBe(0);
        expect(input.selectionEnd).toBe(input.value.length);

        const outsideInput = document.createElement('input');
        outsideInput.value = 'outside';
        document.body.appendChild(outsideInput);
        outsideInput.focus();
        expect(pressFindShortcut(outsideInput).defaultPrevented).toBe(false);

        expect(document.activeElement).toBe(outsideInput);

        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        const dialogInput = document.createElement('input');
        dialog.appendChild(dialogInput);
        document.body.appendChild(dialog);
        dialogInput.focus();
        expect(pressFindShortcut(dialogInput).defaultPrevented).toBe(false);

        expect(document.activeElement).toBe(dialogInput);
    });

    it('expands a collapsed scene and scrolls the active match into view', async () => {
        renderEditor(collapsedSearchFixture());
        const editor = await getEditor();
        const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => undefined);

        editor.commands.setCollapsedScenes(['scene-2']);
        setSearchQuery(await findSearchInput(), 'hidden light');

        await poll(() => document.querySelector('[data-editor-search-current="true"]'), 'active search decoration');
        await poll(() => (getSceneCollapseSnapshot(editor.state).collapsedSceneIds.includes('scene-2') ? null : true), 'collapsed scene expansion');
        await poll(() => (scrollIntoView.mock.calls.length > 0 ? true : null), 'active search result scroll');

        expect(getSceneCollapseSnapshot(editor.state).collapsedSceneIds).not.toContain('scene-2');
        expect(scrollIntoView).toHaveBeenCalledWith({block: 'center', inline: 'nearest'});
    });

    it('keeps the search input focused after pointer navigation', async () => {
        renderEditor();
        const input = await findSearchInput();

        setSearchQuery(input, 'light');
        input.focus();

        await userEvent.click(document.querySelector<HTMLButtonElement>('button[aria-label="Next search result"]')!);

        expect(await waitForResult('2 / 3')).toBe('2 / 3');
        expect(document.activeElement).toBe(input);

        pressEnter(input, {shiftKey: true});

        expect(await waitForResult('1 / 3')).toBe('1 / 3');
    });

    it('uses only background intensity to distinguish the active result', async () => {
        renderEditor();
        const input = await findSearchInput();

        setSearchQuery(input, 'light');

        const matches = await poll(() => {
            const elements = [...document.querySelectorAll<HTMLElement>('[data-editor-search-match="true"]')];

            return elements.length > 1 ? elements : null;
        }, 'passive and active search decorations');
        const active = document.querySelector<HTMLElement>('[data-editor-search-current="true"]');
        const passive = matches.find(match => match !== active);

        expect(active).not.toBeNull();
        expect(passive).not.toBeUndefined();
        expect(getComputedStyle(active!).backgroundColor).not.toBe(getComputedStyle(passive!).backgroundColor);
        expect(getComputedStyle(active!).borderStyle).toBe('none');
        expect(getComputedStyle(active!).outlineStyle).toBe('none');
        expect(getComputedStyle(active!).boxShadow).toBe('none');
    });
});

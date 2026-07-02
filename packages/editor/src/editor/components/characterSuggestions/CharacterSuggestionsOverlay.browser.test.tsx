import '@stagistic/ui/styles/base.css';

import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    type ScriptDocument,
} from '@stagistic/script';
import {useEffect} from 'react';
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

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {
    characterTagComposeKey,
    getCharacterTagComposeFromState,
} from '../../tiptap/extensions/CharacterTagInputExtension';

const persistentCharacters = [
    {
        id: 'johny-id',
        key: 'Johny',
        colorHex: null,
    },
    {
        id: 'josef-id',
        key: 'Josef',
        colorHex: null,
    },
    {
        id: 'vaclav-id',
        key: 'Vaclav',
        colorHex: null,
    },
];

const createStageDirectionDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {
                id: 'stage-direction-1',
            },
            content: [],
        },
    ],
});

const createTwoStageDirectionDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {
                id: 'stage-direction-1',
            },
            content: [],
        }, {
            type: 'stageDirection',
            attrs: {
                id: 'stage-direction-2',
            },
            content: [
                {
                    type: 'text',
                    text: 'Other block',
                },
            ],
        },
    ],
});

const createCharacterBlockDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'character',
            attrs: {
                id: 'character-1',
            },
            content: [],
        },
    ],
});

const createStageDirectionWithCharacterTag = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {
                id: 'stage-direction-1',
            },
            content: [
                {
                    type: 'text',
                    text: 'Johny',
                    marks: [
                        {
                            type: CHARACTER_TAG_MARK_NAME,
                            attrs: {
                                [CHARACTER_TAG_KEY_ATTR]: 'JOHNY',
                                [CHARACTER_TAG_ID_ATTR]: 'johny-id',
                            },
                        },
                    ],
                },
            ],
        },
    ],
});

const mountedRoots: Root[] = [];

type EditorDebugSnapshot = {
    events: string[],
    text: string,
    json: string,
    selection: string,
    rawCompose: string,
    compose: string,
    focused: boolean,
};

type EditorDebugWindow = Window & {
    __characterSuggestionsDebug?: EditorDebugSnapshot,
};

const getEditorDebug = () => (window as EditorDebugWindow).__characterSuggestionsDebug;

const EditorStateProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        if (!editor) {
            return;
        }

        const events: string[] = [];
        const capture = (event: string) => {
            const compose = getCharacterTagComposeFromState(editor.state);
            const rawCompose = characterTagComposeKey.getState(editor.state);
            const {selection} = editor.state;
            const snapshot = {
                events,
                text: editor.state.doc.textContent,
                json: JSON.stringify(editor.getJSON()),
                selection: `${selection.from}-${selection.to}:${selection.empty ? 'empty' : 'range'}`,
                rawCompose: rawCompose ? String(rawCompose.from) : '<none>',
                compose: compose ? `${compose.from}-${compose.to}:${compose.query}` : '<none>',
                focused: editor.view.hasFocus(),
            };

            events.push([
                event,
                `doc=${editor.state.doc.textContent}`,
                `sel=${snapshot.selection}`,
                `raw=${snapshot.rawCompose}`,
                `compose=${snapshot.compose}`,
                `focus=${String(snapshot.focused)}`,
            ].join(' '));
            (window as EditorDebugWindow).__characterSuggestionsDebug = snapshot;
        };
        const handleTransaction = ({transaction}: {transaction: {docChanged: boolean, selectionSet: boolean}}) => {
            capture(`transaction docChanged=${String(transaction.docChanged)} selectionSet=${String(transaction.selectionSet)}`);
        };
        const handleFocus = () => capture('focus');
        const handleBlur = () => capture('blur');

        capture('mounted');
        editor.on('transaction', handleTransaction);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
            delete (window as EditorDebugWindow).__characterSuggestionsDebug;
        };
    }, [editor]);

    return null;
};

const waitForElement = async (selector: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    const editorElement = document.querySelector('[contenteditable="true"]');
    const activeElement = document.activeElement;
    const debug = getEditorDebug();
    const options = Array.from(document.querySelectorAll('[role="option"]'))
        .map(element => element.textContent?.trim())
        .filter(Boolean)
        .join(', ');

    throw new Error([
        `Expected element matching ${selector}`,
        `Editor text: ${editorElement?.textContent ?? '<missing>'}`,
        `Editor html: ${editorElement?.innerHTML ?? '<missing>'}`,
        `Active element: ${activeElement?.tagName ?? '<missing>'}`,
        `Options: ${options || '<none>'}`,
        `Debug: ${debug ? JSON.stringify(debug, null, 2) : '<none>'}`,
    ].join('\n'));
};

const isElementVisible = (element: HTMLElement) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
};

const getOptionByName = (name: string) => {
    return Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
        .find(element => element.textContent?.trim() === name) ?? null;
};

const waitForVisibleOption = async (name: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const option = getOptionByName(name);

        if (option && isElementVisible(option)) {
            return option;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected visible option ${name}`);
};

const waitForVisibleListbox = async () => {
    const listbox = await waitForElement('[role="listbox"][aria-label="Character suggestions"]');

    if (!(listbox instanceof HTMLElement) || !isElementVisible(listbox)) {
        throw new Error('Expected visible character suggestions listbox');
    }

    return listbox;
};

const waitForAnimationFrame = async () => {
    await new Promise(resolve => {
        window.requestAnimationFrame(resolve);
    });
};

const expectSuggestionsVisuallyReachable = async () => {
    const listbox = await waitForVisibleListbox();
    const rect = listbox.getBoundingClientRect();

    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);

    const hitTarget = document.elementFromPoint(rect.left + 4, rect.top + 4);

    expect(hitTarget ? listbox.contains(hitTarget) : false).toBe(true);
};

const expectElementVisible = (element: Element | null, message: string) => {
    if (!(element instanceof HTMLElement) || !isElementVisible(element)) {
        throw new Error(message);
    }
};

const renderEditor = (initialValue = createStageDirectionDocument()) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue,
                persistentCharacters,
            }}
            layout={{autoFocus: true}}
        >
            <ScriptEditor.LeftSidebar>
                <EditorStateProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );

    mountedRoots.push(root);

    return host;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('CharacterSuggestionsOverlay browser behavior', () => {
    it('keeps stage-direction character suggestions visible after typing in a new pill', async () => {
        renderEditor();

        const editor = page.elementLocator(await waitForElement('[contenteditable="true"]'));

        await editor.click();

        await userEvent.type(editor, '@');
        await waitForVisibleListbox();
        await waitForVisibleOption('JOHNY');
        await waitForVisibleOption('JOSEF');
        await expectSuggestionsVisuallyReachable();
        await waitForVisibleListbox();
        await waitForVisibleOption('JOHNY');
        await waitForVisibleOption('JOSEF');
        await expectSuggestionsVisuallyReachable();

        await userEvent.keyboard('J');
        await waitForAnimationFrame();
        await waitForVisibleListbox();
        await waitForVisibleOption('JOHNY');
        await waitForVisibleOption('JOSEF');
        expect(getOptionByName('VACLAV')).toBeNull();
        await expectSuggestionsVisuallyReachable();
        await waitForVisibleListbox();
        await waitForVisibleOption('JOHNY');
        await waitForVisibleOption('JOSEF');
        expect(getOptionByName('VACLAV')).toBeNull();
        await expectSuggestionsVisuallyReachable();
    });

    it('shows character suggestions when editing an existing stage-direction pill', async () => {
        renderEditor(createStageDirectionWithCharacterTag());

        const tag = page.elementLocator(await waitForElement('[data-character-key="JOHNY"]'));

        await tag.click();
        await waitForVisibleListbox();
        await waitForVisibleOption('JOHNY');

        await userEvent.keyboard('{Backspace}{Backspace}{Backspace}');
        await waitForAnimationFrame();
        await waitForVisibleOption('JOHNY');
        await waitForVisibleOption('JOSEF');
        await expectSuggestionsVisuallyReachable();
    });

    it('keeps the "/" delimiter when confirming a suggestion for a second character in a cue block', async () => {
        renderEditor(createCharacterBlockDocument());

        const block = page.elementLocator(await waitForElement('[data-id="character-1"]'));

        await block.click();

        // First character, then the multi-character delimiter, then start the second.
        await userEvent.keyboard('JOHNY+JO');
        await waitForVisibleListbox();
        const option = page.elementLocator(await waitForVisibleOption('JOSEF'));

        expect(document.querySelector('[data-id="character-1"]')?.textContent).toContain('JOHNY/JO');

        await option.click();
        await waitForAnimationFrame();

        const text = document.querySelector('[data-id="character-1"]')?.textContent ?? '';

        expect(text).toContain('JOHNY/JOSEF');
        expect(text).not.toContain('+');
    });

    it('keeps a typed stage-direction character pill when focus moves to another block', async () => {
        renderEditor(createTwoStageDirectionDocument());

        const firstBlock = page.elementLocator(await waitForElement('[data-id="stage-direction-1"]'));

        await firstBlock.click();

        await userEvent.keyboard('@');
        await waitForVisibleListbox();
        await userEvent.keyboard('J');
        await waitForAnimationFrame();
        await waitForVisibleOption('JOHNY');

        const secondBlock = page.elementLocator(await waitForElement('[data-id="stage-direction-2"]'));

        await secondBlock.click();
        await waitForAnimationFrame();

        const tag = document.querySelector('[data-id="stage-direction-1"] [data-character-key="J"]');

        expectElementVisible(tag, 'Expected typed character tag to stay rendered as a pill');
        expect(tag?.textContent).toBe('J');
    });
});

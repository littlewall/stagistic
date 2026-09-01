import '@stagistic/ui/styles/base.css';

import type {
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {
    createRoot,
    type Root,
} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {findScriptBlockByIdFromState} from '../../tiptap/scriptCore';

type SceneActionsTestWindow = Window & {__sceneActionsTestEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene',
    attrs: {id},
    content: [{type: 'text', text}],
});

const dialogue = (id: string, text: string): ScriptNode => ({
    type: 'dialogue',
    attrs: {id},
    content: [{type: 'text', text}],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneActionsTestWindow).__sceneActionsTestEditor = editor;

        return () => {
            delete (window as SceneActionsTestWindow).__sceneActionsTestEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = (initialValue: ScriptDocument) => {
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

const poll = async <T, >(get: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = get();

        if (value) {
            return value;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => poll(
    () => (window as SceneActionsTestWindow).__sceneActionsTestEditor ?? null,
    'editor instance',
);

const focusBlock = (editor: Editor, blockId: string) => {
    const block = findScriptBlockByIdFromState(editor.state, blockId);

    if (!block) {
        throw new Error(`Block "${blockId}" not found`);
    }

    editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.create(editor.state.doc, block.from)),
    );
    editor.commands.focus();
};

const actionTrigger = (blockId: string) => document.querySelector<HTMLButtonElement>(
    `[data-block-action-trigger="true"][data-block-id="${blockId}"]`,
);

const typeTrigger = (blockId: string) => document.querySelector<HTMLButtonElement>(
    `[data-block-actions-trigger="true"][data-block-id="${blockId}"]`,
);

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene block actions', () => {
    it('offers a Delete scene heading action on a non-first scene', async () => {
        renderEditor({
            type: 'doc',
            content: [
                scene('s1', 'S1'),
                dialogue('d1', 'hi'),
                scene('s2', 'S2'),
            ],
        });

        const editor = await getEditor();

        focusBlock(editor, 's2');

        const trigger = await poll(() => actionTrigger('s2'), 's2 action trigger');

        await page.elementLocator(trigger).click();

        const menuItem = await poll(
            () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
                .find(item => (item.getAttribute('aria-label') ?? item.textContent?.trim())
                    === 'Delete scene heading') ?? null,
            'Delete scene heading item',
        );

        expect(menuItem).not.toBeNull();
    });

    it('hides the action trigger on the first scene', async () => {
        renderEditor({
            type: 'doc',
            content: [
                scene('s1', 'S1'),
                dialogue('d1', 'hi'),
                scene('s2', 'S2'),
            ],
        });

        const editor = await getEditor();

        focusBlock(editor, 's1');

        // The always-present type trigger proves the gutter for s1 rendered…
        await poll(() => typeTrigger('s1'), 's1 type trigger');

        // …but the first scene exposes no block-action (⋮) trigger.
        expect(actionTrigger('s1')).toBeNull();
    });
});

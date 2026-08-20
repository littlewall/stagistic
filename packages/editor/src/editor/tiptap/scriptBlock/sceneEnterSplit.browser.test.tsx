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
import {userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {findScriptBlockByIdFromState} from '../scriptCore';

type SceneTestWindow = Window & {__sceneEnterReproEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneTestWindow).__sceneEnterReproEditor = editor;

        return () => {
            delete (window as SceneTestWindow).__sceneEnterReproEditor;
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
    () => (window as SceneTestWindow).__sceneEnterReproEditor ?? null,
    'editor instance',
);

const placeCaret = (editor: Editor, blockId: string, offset: number) => {
    const block = findScriptBlockByIdFromState(editor.state, blockId);

    if (!block) {
        throw new Error(`Block "${blockId}" not found`);
    }

    editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.create(editor.state.doc, block.from + offset)),
    );
    editor.commands.focus();
};

const blockTypes = (editor: Editor) => (editor.getJSON().content ?? []).map(node => node.type);

const blockText = (editor: Editor, index: number): string => {
    const content = (editor.getJSON().content ?? []) as ScriptNode[];
    const node = content[index];
    const children = (node?.content ?? []) as {text?: string}[];

    return children.map(child => child.text ?? '').join('');
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene Enter split', () => {
    it('Enter at the end of a scene creates the configured next type, not a second scene', async () => {
        renderEditor({
            type: 'doc',
            content: [scene('s1', 'INT. HOUSE')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 1 ? true : null, 'one block');

        placeCaret(editor, 's1', 'INT. HOUSE'.length);
        await userEvent.keyboard('{Enter}');

        expect(blockTypes(editor)).toEqual(['scene', 'stageDirection']);
        expect(blockText(editor, 0)).toBe('INT. HOUSE');
        expect(blockText(editor, 1)).toBe('');
    });

    it('Enter mid-text of a scene moves the trailing text into the configured next type', async () => {
        renderEditor({
            type: 'doc',
            content: [scene('s1', 'INT. HOUSE')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 1 ? true : null, 'one block');

        placeCaret(editor, 's1', 'INT. '.length);
        await userEvent.keyboard('{Enter}');

        expect(blockTypes(editor)).toEqual(['scene', 'stageDirection']);
        expect(blockText(editor, 0)).toBe('INT. ');
        expect(blockText(editor, 1)).toBe('HOUSE');
    });
});

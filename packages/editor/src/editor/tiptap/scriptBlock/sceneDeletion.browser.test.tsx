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
import {
    findScriptBlockByIdFromState,
    getActiveScriptBlockFromState,
} from '../scriptCore';

type SceneTestWindow = Window & {__sceneDeletionTestEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const stageDirection = (id: string, text: string): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneTestWindow).__sceneDeletionTestEditor = editor;

        return () => {
            delete (window as SceneTestWindow).__sceneDeletionTestEditor;
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
    () => (window as SceneTestWindow).__sceneDeletionTestEditor ?? null,
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

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene heading deletion barrier', () => {
    it('removes an empty block after a scene and moves the caret into the scene', async () => {
        renderEditor({
            type: 'doc',
            content: [scene('s1', ''), stageDirection('b1', '')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        placeCaret(editor, 'b1', 0);
        await userEvent.keyboard('{Backspace}');

        expect(blockTypes(editor)).toEqual(['scene']);
        expect(getActiveScriptBlockFromState(editor.state)?.id).toBe('s1');
    });

    it('Backspace at scene start does not merge the scene into the previous block', async () => {
        renderEditor({
            type: 'doc',
            content: [stageDirection('b1', 'A room.'), scene('s1', 'INT. HOUSE')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        placeCaret(editor, 's1', 0);
        await userEvent.keyboard('{Backspace}');

        expect(blockTypes(editor)).toEqual(['stageDirection', 'scene']);
        expect(findScriptBlockByIdFromState(editor.state, 's1')?.node.textContent).toBe('INT. HOUSE');
    });

    it('forward Delete at end of the previous block does not consume the scene', async () => {
        renderEditor({
            type: 'doc',
            content: [stageDirection('b1', 'A room.'), scene('s1', 'INT. HOUSE')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        placeCaret(editor, 'b1', 'A room.'.length);
        await userEvent.keyboard('{Delete}');

        expect(blockTypes(editor)).toEqual(['stageDirection', 'scene']);
        expect(findScriptBlockByIdFromState(editor.state, 'b1')?.node.textContent).toBe('A room.');
    });

    it('Backspace inside the scene text still deletes normally', async () => {
        renderEditor({
            type: 'doc',
            content: [stageDirection('b1', 'A room.'), scene('s1', 'INT. HOUSE')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        placeCaret(editor, 's1', 'INT. HOUSE'.length);
        await userEvent.keyboard('{Backspace}');

        expect(findScriptBlockByIdFromState(editor.state, 's1')?.node.textContent).toBe('INT. HOUS');
    });

    it('ArrowLeft still moves the caret out of the scene block (navigation unaffected)', async () => {
        renderEditor({
            type: 'doc',
            content: [stageDirection('b1', 'A room.'), scene('s1', 'INT. HOUSE')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        placeCaret(editor, 's1', 0);
        await userEvent.keyboard('{ArrowLeft}');

        expect(getActiveScriptBlockFromState(editor.state)?.id).toBe('b1');
    });
});

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

type SceneTestWindow = Window & {__sceneRangeDeletionEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const stageDirection = (id: string, text: string): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneTestWindow).__sceneRangeDeletionEditor = editor;

        return () => {
            delete (window as SceneTestWindow).__sceneRangeDeletionEditor;
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
    () => (window as SceneTestWindow).__sceneRangeDeletionEditor ?? null,
    'editor instance',
);

const selectRange = (
    editor: Editor,
    fromId: string,
    fromOffset: number,
    toId: string,
    toOffset: number,
) => {
    const fromBlock = findScriptBlockByIdFromState(editor.state, fromId);
    const toBlock = findScriptBlockByIdFromState(editor.state, toId);

    if (!fromBlock || !toBlock) {
        throw new Error('Range endpoints not found');
    }

    editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            fromBlock.from + fromOffset,
            toBlock.from + toOffset,
        )),
    );
    editor.commands.focus();
};

const blockTypes = (editor: Editor) => (editor.getJSON().content ?? []).map(node => node.type);

const text = (editor: Editor, id: string) => findScriptBlockByIdFromState(editor.state, id)?.node.textContent;

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene range deletion', () => {
    it('deletes across A -> scene -> B, keeping the scene as an empty divider', async () => {
        renderEditor({
            type: 'doc',
            content: [
                scene('s0', 'OPENING'),
                stageDirection('a', 'HELLO'),
                scene('s1', 'MIDDLE'),
                stageDirection('b', 'WORLD'),
            ],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 4 ? true : null, 'four blocks');

        selectRange(editor, 'a', 2, 'b', 2);
        await userEvent.keyboard('{Delete}');

        expect(blockTypes(editor)).toEqual([
            'scene',
            'stageDirection',
            'scene',
            'stageDirection',
        ]);
        expect(text(editor, 's1')).toBe('');
        expect(text(editor, 'a')).toBe('HE');
        expect(text(editor, 'b')).toBe('RLD');
        expect(text(editor, 's0')).toBe('OPENING');
    });

    it('Backspace across a fully-selected scene empties it but keeps the node', async () => {
        renderEditor({
            type: 'doc',
            content: [
                scene('s0', 'OPENING'),
                stageDirection('a', 'HELLO'),
                scene('s1', 'MIDDLE'),
                stageDirection('b', 'WORLD'),
            ],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 4 ? true : null, 'four blocks');

        // From end of A through the whole scene to start of B.
        selectRange(editor, 'a', 'HELLO'.length, 'b', 0);
        await userEvent.keyboard('{Backspace}');

        expect(blockTypes(editor)).toEqual([
            'scene',
            'stageDirection',
            'scene',
            'stageDirection',
        ]);
        expect(text(editor, 's1')).toBe('');
        expect(text(editor, 'a')).toBe('HELLO');
        expect(text(editor, 'b')).toBe('WORLD');
    });
});

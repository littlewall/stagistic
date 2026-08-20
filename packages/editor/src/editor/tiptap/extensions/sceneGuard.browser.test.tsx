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

type SceneGuardTestWindow = Window & {__sceneGuardTestEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const stageDirection = (id: string, text: string): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const dialogue = (id: string, text: string): ScriptNode => ({
    type: 'dialogue', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneGuardTestWindow).__sceneGuardTestEditor = editor;

        return () => {
            delete (window as SceneGuardTestWindow).__sceneGuardTestEditor;
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
    () => (window as SceneGuardTestWindow).__sceneGuardTestEditor ?? null,
    'editor instance',
);

const blockTypes = (editor: Editor) => (editor.getJSON().content ?? []).map(node => node.type);

const sceneCount = (editor: Editor) => blockTypes(editor).filter(type => type === 'scene').length;

const selectAcrossBlocks = (
    editor: Editor,
    from: {blockId: string, offset: number},
    to: {blockId: string, offset: number},
) => {
    const fromBlock = findScriptBlockByIdFromState(editor.state, from.blockId);
    const toBlock = findScriptBlockByIdFromState(editor.state, to.blockId);

    if (!fromBlock || !toBlock) {
        throw new Error('Block not found for selection');
    }

    editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            fromBlock.from + from.offset,
            toBlock.from + to.offset,
        )),
    );
    editor.commands.focus();
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene guard extension', () => {
    it('rejects a range delete that spans a scene heading (nothing deleted)', async () => {
        renderEditor({
            type: 'doc',
            content: [
                stageDirection('b1', 'Before'),
                scene('s2', 'INT. HOUSE'),
                stageDirection('b2', 'After'),
            ],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 3 ? true : null, 'three blocks');

        selectAcrossBlocks(editor, {blockId: 'b1', offset: 3}, {blockId: 'b2', offset: 2});
        await userEvent.keyboard('{Delete}');

        expect(blockTypes(editor)).toEqual([
            'stageDirection',
            'scene',
            'stageDirection',
        ]);
        expect(findScriptBlockByIdFromState(editor.state, 'b1')?.node.textContent).toBe('Before');
    });

    it('keeps every scene node on select-all + Delete', async () => {
        renderEditor({
            type: 'doc',
            content: [
                scene('s1', 'S1'),
                dialogue('d1', 'hi'),
                scene('s2', 'S2'),
            ],
        });

        const editor = await getEditor();

        await poll(() => sceneCount(editor) === 2 ? true : null, 'two scenes');

        editor.commands.selectAll();
        editor.commands.focus();
        await userEvent.keyboard('{Delete}');

        expect(sceneCount(editor)).toBe(2);
    });
});

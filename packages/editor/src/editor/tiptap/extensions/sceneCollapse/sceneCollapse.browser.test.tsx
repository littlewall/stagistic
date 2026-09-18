import '@stagistic/ui/styles/base.css';

import type {
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';
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

import {useEditorInstance} from '../../../context';
import ScriptEditor from '../../../Editor';
import {
    findScriptBlockByIdFromState,
    getActiveScriptBlockFromState,
} from '../../scriptCore';

type CollapseTestWindow = Window & {__sceneCollapseTestEditor?: Editor | null};

const block = (type: ScriptNode['type'], id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

const documentFixture = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('scene', 's1', 'FIRST'),
        block('stageDirection', 'b1', 'A room.'),
        block('dialogue', 'b2', 'Hello.'),
        block('scene', 's2', 'SECOND'),
        block('stageDirection', 'b3', 'Outside.'),
    ],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as CollapseTestWindow).__sceneCollapseTestEditor = editor;

        return () => {
            delete (window as CollapseTestWindow).__sceneCollapseTestEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = () => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor document={{initialValue: documentFixture()}} layout={{autoFocus: true}}>
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

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => poll(
    () => (window as CollapseTestWindow).__sceneCollapseTestEditor ?? null,
    'editor instance',
);

const blockElement = (editor: Editor, blockId: string) => {
    return editor.view.dom.querySelector<HTMLElement>(`[data-id='${blockId}']`);
};

const placeCaret = (editor: Editor, blockId: string, offset: number) => {
    const target = findScriptBlockByIdFromState(editor.state, blockId);

    if (!target) {
        throw new Error(`Missing block ${blockId}`);
    }

    editor.commands.focus(target.from + offset);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene collapse extension', () => {
    it('decorates only the body of the collapsed scene', async () => {
        renderEditor();

        const editor = await getEditor();

        await poll(() => blockElement(editor, 's1'), 'first scene');

        expect(editor.commands.toggleSceneCollapsed('s1')).toBe(true);
        expect(blockElement(editor, 's1')?.getAttribute('data-scene-collapsed')).toBe('true');
        expect(blockElement(editor, 'b1')?.getAttribute('data-scene-content-collapsed')).toBe('true');
        expect(blockElement(editor, 'b2')?.getAttribute('data-scene-content-collapsed')).toBe('true');
        expect(blockElement(editor, 's2')?.getAttribute('data-scene-content-collapsed')).toBeNull();
        expect(blockElement(editor, 'b3')?.getAttribute('data-scene-content-collapsed')).toBeNull();
        expect(getComputedStyle(blockElement(editor, 'b1')!).display).toBe('none');
    });

    it('toggles multiple scenes independently without changing document JSON', async () => {
        renderEditor();

        const editor = await getEditor();
        const before = editor.getJSON();

        expect(editor.commands.toggleSceneCollapsed('s1')).toBe(true);
        expect(editor.commands.toggleSceneCollapsed('s2')).toBe(true);
        expect(blockElement(editor, 'b1')?.getAttribute('data-scene-content-collapsed')).toBe('true');
        expect(blockElement(editor, 'b3')?.getAttribute('data-scene-content-collapsed')).toBe('true');
        expect(editor.getJSON()).toEqual(before);

        expect(editor.commands.toggleSceneCollapsed('s1')).toBe(true);
        expect(blockElement(editor, 'b1')?.getAttribute('data-scene-content-collapsed')).toBeNull();
        expect(blockElement(editor, 'b3')?.getAttribute('data-scene-content-collapsed')).toBe('true');
    });

    it('rejects ids that are not scene headings', async () => {
        renderEditor();

        const editor = await getEditor();

        expect(editor.commands.toggleSceneCollapsed('missing')).toBe(false);
        expect(editor.commands.toggleSceneCollapsed('b1')).toBe(false);
    });

    it('moves a caret inside the scene body to its heading when collapsing', async () => {
        renderEditor();

        const editor = await getEditor();

        placeCaret(editor, 'b1', 2);
        expect(editor.commands.toggleSceneCollapsed('s1')).toBe(true);

        expect(getActiveScriptBlockFromState(editor.state)?.id).toBe('s1');
        expect(editor.state.selection.from).toBe(
            findScriptBlockByIdFromState(editor.state, 's1')?.to,
        );
    });

    it('expands when a programmatic focus enters hidden scene content', async () => {
        renderEditor();

        const editor = await getEditor();

        placeCaret(editor, 's1', 1);
        editor.commands.toggleSceneCollapsed('s1');
        expect(blockElement(editor, 'b1')?.getAttribute('data-scene-content-collapsed')).toBe('true');

        placeCaret(editor, 'b1', 1);

        expect(blockElement(editor, 's1')?.getAttribute('data-scene-collapsed')).toBeNull();
        expect(blockElement(editor, 'b1')?.getAttribute('data-scene-content-collapsed')).toBeNull();
    });

    it('expands before Enter continues from a collapsed heading', async () => {
        renderEditor();

        const editor = await getEditor();

        placeCaret(editor, 's1', 'FIRST'.length);
        editor.commands.toggleSceneCollapsed('s1');
        await userEvent.keyboard('{Enter}');

        expect(blockElement(editor, 's1')?.getAttribute('data-scene-collapsed')).toBeNull();
        expect(getActiveScriptBlockFromState(editor.state)?.blockType).toBe('stageDirection');
    });

    it('skips collapsed content with down and returns with up', async () => {
        renderEditor();

        const editor = await getEditor();

        placeCaret(editor, 's1', 'FIRST'.length);
        editor.commands.toggleSceneCollapsed('s1');
        await userEvent.keyboard('{ArrowDown}');

        expect(getActiveScriptBlockFromState(editor.state)?.id).toBe('s2');

        placeCaret(editor, 's2', 0);
        await userEvent.keyboard('{ArrowUp}');

        expect(getActiveScriptBlockFromState(editor.state)?.id).toBe('s1');
        expect(blockElement(editor, 's1')?.getAttribute('data-scene-collapsed')).toBe('true');
    });
});

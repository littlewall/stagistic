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

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {findScriptBlockByIdFromState} from '../scriptCore';
import {updateBlockType} from './commands';

type ConvertCall = [sceneHeadingBlockId: string, targetBlockType: string];

type SceneConvertTestWindow = Window & {
    __sceneConvertEditor?: Editor | null,
    __sceneConvertCalls?: ConvertCall[],
};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const dialogue = (id: string, text: string): ScriptNode => ({
    type: 'dialogue', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneConvertTestWindow).__sceneConvertEditor = editor;

        return () => {
            delete (window as SceneConvertTestWindow).__sceneConvertEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = (initialValue: ScriptDocument) => {
    (window as SceneConvertTestWindow).__sceneConvertCalls = [];

    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue}}
            layout={{autoFocus: true}}
            callbacks={{
                onRequestConvertScene: (sceneHeadingBlockId, targetBlockType) => {
                    (window as SceneConvertTestWindow).__sceneConvertCalls?.push([sceneHeadingBlockId, targetBlockType]);
                },
            }}
        >
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
    () => (window as SceneConvertTestWindow).__sceneConvertEditor ?? null,
    'editor instance',
);

const focusBlock = (editor: Editor, id: string) => {
    const block = findScriptBlockByIdFromState(editor.state, id);

    if (!block) {
        throw new Error(`Block ${id} not found`);
    }

    editor.commands.focus(block.from);
};

const blockTypes = (editor: Editor) => (editor.getJSON().content ?? []).map(node => node.type);

const convertCalls = () => (window as SceneConvertTestWindow).__sceneConvertCalls ?? [];

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene conversion request', () => {
    it('raises onRequestConvertScene instead of mutating when converting a scene', async () => {
        renderEditor({
            type: 'doc',
            content: [scene('s1', 'INT. HOUSE'), dialogue('d1', 'hi')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        focusBlock(editor, 's1');
        updateBlockType(editor, 'dialogue');

        // The scene stays a scene — the host must confirm the conversion first.
        expect(blockTypes(editor)).toEqual(['scene', 'dialogue']);
        expect(convertCalls()).toEqual([['s1', 'dialogue']]);
    });

    it('converts a non-scene block immediately without raising the request', async () => {
        renderEditor({
            type: 'doc',
            content: [scene('s1', 'INT. HOUSE'), dialogue('d1', 'hi')],
        });

        const editor = await getEditor();

        await poll(() => blockTypes(editor).length === 2 ? true : null, 'two blocks');

        focusBlock(editor, 'd1');
        updateBlockType(editor, 'lyrics');

        expect(blockTypes(editor)).toEqual(['scene', 'lyrics']);
        expect(convertCalls()).toEqual([]);
    });
});

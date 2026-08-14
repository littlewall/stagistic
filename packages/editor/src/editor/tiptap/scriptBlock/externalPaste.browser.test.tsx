import '@stagistic/ui/styles/base.css';

import type {
    ScriptBlockNodeType,
    ScriptDocument,
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

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type TestWindow = Window & {__externalPasteEditor?: Editor | null};

const BLOCK_TYPES: readonly ScriptBlockNodeType[] = [
    'scene',
    'act',
    'stageDirection',
    'character',
    'aside',
    'dialogue',
    'lyrics',
    'note',
];

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as TestWindow).__externalPasteEditor = editor;

        return () => {
            delete (window as TestWindow).__externalPasteEditor;
        };
    }, [editor]);

    return null;
};

const roots: Root[] = [];

const renderEditor = (blockType: ScriptBlockNodeType, text = '') => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const initialValue: ScriptDocument = {
        type: 'doc',
        content: [
            {
                type: blockType,
                attrs: {id: 'paste-target'},
                content: text ? [{type: 'text', text}] : undefined,
            },
        ],
    };

    document.body.appendChild(host);
    root.render(
        <ScriptEditor document={{initialValue}}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    roots.push(root);
};

const getEditor = async () => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
        const editor = (window as TestWindow).__externalPasteEditor;

        if (editor) {
            return editor;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for editor');
};

const pasteClipboard = async (
    editor: Editor,
    text: string,
    html: string,
) => {
    const clipboardData = new DataTransfer();

    clipboardData.setData('text/plain', text);
    clipboardData.setData('text/html', html);
    editor.view.dom.dispatchEvent(new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
    }));
    await new Promise(resolve => window.requestAnimationFrame(resolve));
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete (window as TestWindow).__externalPasteEditor;
});

describe('external multiline paste', () => {
    it.each(BLOCK_TYPES)('keeps every pasted line as %s', async blockType => {
        renderEditor(blockType);

        const editor = await getEditor();

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            1,
        )));
        await pasteClipboard(
            editor,
            'FIRST LINE\nSECOND LINE',
            '<div>FIRST LINE</div><div>SECOND LINE</div>',
        );

        const blocks = Array.from({length: editor.state.doc.childCount}, (_, index) => {
            const node = editor.state.doc.child(index);

            return {type: node.type.name, text: node.textContent};
        });

        expect(blocks).toEqual([{type: blockType, text: 'FIRST LINE'}, {type: blockType, text: 'SECOND LINE'}]);
    });

    it('drops trailing blank lines but preserves blank lines inside the pasted text', async () => {
        renderEditor('dialogue');

        const editor = await getEditor();

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            1,
        )));
        await pasteClipboard(
            editor,
            'ONE\nTWO\nTHREE\n\nFIVE\nSIX\nSEVEN\n\n\n\n',
            '<div>ONE</div><div>TWO</div><div>THREE</div><div><br></div><div>FIVE</div><div>SIX</div><div>SEVEN</div>',
        );

        expect(Array.from({length: editor.state.doc.childCount}, (_, index) => {
            const node = editor.state.doc.child(index);

            return {type: node.type.name, text: node.textContent};
        })).toEqual([
            {type: 'dialogue', text: 'ONE'},
            {type: 'dialogue', text: 'TWO'},
            {type: 'dialogue', text: 'THREE'},
            {type: 'dialogue', text: ''},
            {type: 'dialogue', text: 'FIVE'},
            {type: 'dialogue', text: 'SIX'},
            {type: 'dialogue', text: 'SEVEN'},
        ]);
    });

    it('splits the active block around multiline text pasted at the caret', async () => {
        renderEditor('lyrics', 'BEFORE  AFTER');

        const editor = await getEditor();

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            8,
        )));
        await pasteClipboard(
            editor,
            'FIRST LINE\nSECOND LINE',
            '<div>FIRST LINE</div><div>SECOND LINE</div>',
        );

        expect(Array.from({length: editor.state.doc.childCount}, (_, index) => {
            const node = editor.state.doc.child(index);

            return {type: node.type.name, text: node.textContent};
        })).toEqual([{type: 'lyrics', text: 'BEFORE FIRST LINE'}, {type: 'lyrics', text: 'SECOND LINE AFTER'}]);
    });

    it('preserves explicit block types in structured Stagistic clipboard HTML', async () => {
        renderEditor('lyrics');

        const editor = await getEditor();

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            1,
        )));
        await pasteClipboard(
            editor,
            'ALICE\nHello',
            '<p blocktype="character">ALICE</p><p blocktype="dialogue">Hello</p>',
        );

        expect(Array.from({length: editor.state.doc.childCount}, (_, index) => {
            const node = editor.state.doc.child(index);

            return {type: node.type.name, text: node.textContent};
        })).toEqual([{type: 'character', text: 'ALICE'}, {type: 'dialogue', text: 'Hello'}]);
    });
});

import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from './context';
import ScriptEditor from './Editor';

type ReadOnlyTestWindow = Window & {__readOnlyEditor?: Editor | null};

const block = (type: string, id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: [{type: 'text', text}],
});

const DOCUMENT: ScriptDocument = {
    type: 'doc',
    content: [block('scene', 's1', 'INT. LIGHTHOUSE'), block('stageDirection', 'b1', 'The room is dark.')],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as ReadOnlyTestWindow).__readOnlyEditor = editor;

        return () => {
            delete (window as ReadOnlyTestWindow).__readOnlyEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = (isReadOnly: boolean) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor document={{initialValue: DOCUMENT}} isReadOnly={isReadOnly}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    mountedRoots.push(root);
};

const getEditor = async (): Promise<Editor> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const editor = (window as ReadOnlyTestWindow).__readOnlyEditor;

        if (editor) {
            return editor;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for editor');
};

const texts = (editor: Editor) => {
    const blocks: string[] = [];

    editor.state.doc.forEach(node => blocks.push(node.textContent));

    return blocks;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('read-only editor', () => {
    it('ignores typing and editor commands but keeps the text selectable', async () => {
        renderEditor(true);

        const editor = await getEditor();
        const paragraph = [...document.querySelectorAll('[data-editor] *')].find(element => element.textContent === 'The room is dark.');

        expect(editor.isEditable).toBe(false);

        await userEvent.click(paragraph!);
        await userEvent.keyboard('XYZ{Enter}{Backspace}');
        editor.commands.insertContent('Inserted by a command');
        editor.commands.setTextSelection({from: 1, to: 4});

        expect(texts(editor)).toEqual(['INT. LIGHTHOUSE', 'The room is dark.']);
        expect(editor.state.selection.empty).toBe(false);
    });

    it('shows only search in the toolbar', async () => {
        renderEditor(true);
        await getEditor();

        expect(document.querySelector('[aria-label="Search script"]')).not.toBeNull();
        expect(document.querySelector('[aria-label="Bold"]')).toBeNull();
        expect(document.querySelector('[aria-label="Change block type"]')).toBeNull();
        expect(document.querySelector('[aria-label="Toggle replace"]')).toBeNull();
    });

    it('stays editable by default', async () => {
        renderEditor(false);

        const editor = await getEditor();

        editor.commands.insertContentAt(editor.state.doc.content.size - 1, '!');

        expect(editor.isEditable).toBe(true);
        expect(texts(editor)[1]).toBe('The room is dark.!');
        expect(document.querySelector('[aria-label="Bold"]')).not.toBeNull();
    });
});

import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
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
import {renameCharacterText} from './characterRefCommands';

type TestWindow = Window & {__cueRenameEditor?: Editor | null};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as TestWindow).__cueRenameEditor = editor;

        return () => {
            delete (window as TestWindow).__cueRenameEditor;
        };
    }, [editor]);

    return null;
};

const roots: Root[] = [];

const renderEditor = (text: string) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const initialValue: ScriptDocument = {
        type: 'doc',
        content: [
            {
                type: 'character',
                attrs: {id: 'cue', characterRefs: {ANNA: 'char-anna', BOB: 'char-bob'}},
                content: [{type: 'text', text}],
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
        const editor = (window as TestWindow).__cueRenameEditor;

        if (editor) {
            return editor;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for editor');
};

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.replaceChildren();
});

describe('cue rename delimiter', () => {
    it.each(['ANNA/BOB', 'ANNA+BOB'])('renaming a character in the cue %s writes `/`', async cue => {
        renderEditor(cue);

        const editor = await getEditor();

        expect(renameCharacterText(editor, 'char-anna', 'CLARA')).toBe(true);
        expect(editor.state.doc.child(0).textContent).toBe('CLARA/BOB');
    });
});

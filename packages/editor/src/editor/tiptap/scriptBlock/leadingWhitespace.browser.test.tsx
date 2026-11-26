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
import {userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {createEditorSnapshotStore} from '../../live/store';
import {createScriptDocumentSession} from '../../session/createScriptDocumentSession';
import {ScriptDocumentRuntime} from '../../session/ScriptDocumentRuntime';

type TestWindow = Window & {__leadingWhitespaceEditor?: Editor | null};

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
        (window as TestWindow).__leadingWhitespaceEditor = editor;

        return () => {
            delete (window as TestWindow).__leadingWhitespaceEditor;
        };
    }, [editor]);

    return null;
};

const roots: Root[] = [];

/* The app mounts the editor through a detached runtime and a document session; mirror that setup. */
const renderEditor = (blockType: ScriptBlockNodeType, text = '', withSession = false) => {
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

    if (withSession) {
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });

        root.render(
            <>
                <ScriptDocumentRuntime session={session} document={{initialValue}} />
                <ScriptEditor session={session} document={{initialValue}}>
                    <ScriptEditor.LeftSidebar>
                        <EditorProbe />
                    </ScriptEditor.LeftSidebar>
                </ScriptEditor>
            </>,
        );
    } else {
        root.render(
            <ScriptEditor document={{initialValue}}>
                <ScriptEditor.LeftSidebar>
                    <EditorProbe />
                </ScriptEditor.LeftSidebar>
            </ScriptEditor>,
        );
    }

    roots.push(root);
};

const getEditor = async () => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
        const editor = (window as TestWindow).__leadingWhitespaceEditor;

        if (editor && !editor.isDestroyed) {
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

const blockTexts = (editor: Editor) => Array.from({length: editor.state.doc.childCount}, (_, index) => editor.state.doc.child(index).textContent);

/*
 * With a document session the editor can be replaced while the session settles,
 * so this places the caret on the live instance and returns it for the rest of the test.
 */
const placeCaret = async (initial: Editor, offset: number, end = offset): Promise<Editor> => {
    let editor = initial;
    let placed: Editor | null = null;
    // Focus lands one animation frame late.
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
        if (editor.isDestroyed) {
            editor = await getEditor();
        }

        if (placed !== editor) {
            editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1 + offset, 1 + end)));
            editor.commands.focus();
            placed = editor;
        }

        if (editor.view.hasFocus()) {
            break;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    expect(editor.view.hasFocus()).toBe(true);

    return editor;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete (window as TestWindow).__leadingWhitespaceEditor;
});

describe('no leading whitespace (typing)', () => {
    it.each(BLOCK_TYPES)('ignores space and Tab at the start of %s (Tab may still switch dialogue/lyrics/aside)', async blockType => {
        renderEditor(blockType);

        const editor = await getEditor();

        await placeCaret(editor, 0);
        await userEvent.keyboard(' ');
        await userEvent.keyboard('{Tab}');
        await userEvent.keyboard('  ');

        expect(blockTexts(editor)[0]).toBe('');
    });

    it('keeps spaces after the first character', async () => {
        renderEditor('dialogue');

        const editor = await getEditor();

        await placeCaret(editor, 0);
        await userEvent.keyboard('A B');

        expect(blockTexts(editor)).toEqual(['A B']);
    });

    it('ignores a space typed before existing text at block start', async () => {
        renderEditor('lyrics', 'WORD');

        const editor = await getEditor();

        await placeCaret(editor, 0);
        await userEvent.keyboard(' ');

        expect(blockTexts(editor)).toEqual(['WORD']);
    });
});

describe('no leading whitespace (paste)', () => {
    it.each(BLOCK_TYPES)('drops leading whitespace of a single line pasted at the start of %s', async blockType => {
        renderEditor(blockType);

        const editor = await getEditor();

        await placeCaret(editor, 0);
        await pasteClipboard(editor, '  \tfoo bar', '');

        expect(blockTexts(editor)[0].toLocaleLowerCase()).toBe('foo bar');
    });

    it.each(BLOCK_TYPES)('drops leading whitespace of every pasted line in %s', async blockType => {
        renderEditor(blockType);

        const editor = await getEditor();

        await placeCaret(editor, 0);
        await pasteClipboard(editor, '  ONE\n\t TWO  X\n   THREE', '<div>  ONE</div><div>\t TWO  X</div><div>   THREE</div>');

        expect(blockTexts(editor)).toEqual([
            'ONE',
            'TWO  X',
            'THREE',
        ]);
    });

    it('keeps leading whitespace of the first line when pasting mid-text', async () => {
        renderEditor('dialogue', 'AB');

        const editor = await getEditor();

        await placeCaret(editor, 1);
        await pasteClipboard(editor, ' x', '');

        expect(blockTexts(editor)).toEqual(['A xB']);
    });

    it('drops leading whitespace of blocks in structured Stagistic clipboard HTML', async () => {
        renderEditor('dialogue');

        const editor = await getEditor();

        await placeCaret(editor, 0);
        await pasteClipboard(
            editor,
            ' ONE\n TWO',
            '<p data-block-type="dialogue"> ONE</p><p data-block-type="lyrics"> TWO</p>',
        );

        expect(blockTexts(editor)).toEqual(['ONE', 'TWO']);
    });
});

describe('no leading whitespace (other edits)', () => {
    it('strips the space Enter leaves at the start of the second half', async () => {
        renderEditor('dialogue', 'A B');

        const editor = await getEditor();

        await placeCaret(editor, 1);
        await userEvent.keyboard('{Enter}');

        const texts = blockTexts(editor);

        expect(texts.join('|')).toContain('A');
        expect(texts.some(text => text.startsWith(' '))).toBe(false);
        expect(texts.join('')).toBe('AB');
    });

    it('strips the space Backspace leaves at the start, keeps the caret there, and undoes in one step', async () => {
        renderEditor('dialogue', 'x y');

        const editor = await getEditor();

        await placeCaret(editor, 1);
        await userEvent.keyboard('{Backspace}');

        expect(blockTexts(editor)).toEqual(['y']);
        expect(editor.state.selection.from).toBe(1);

        editor.commands.undo();

        expect(blockTexts(editor)).toEqual(['x y']);
    });

    it('deletes the selection when a space is typed over it at the block start', async () => {
        renderEditor('lyrics', 'WORD');

        const editor = await getEditor();

        await placeCaret(editor, 0, 2);
        await userEvent.keyboard(' ');

        expect(blockTexts(editor)).toEqual(['RD']);
    });

    it('leaves a stored leading indent alone until its block is edited', async () => {
        renderEditor('stageDirection', '\tIndented');

        const editor = await getEditor();

        expect(blockTexts(editor)).toEqual(['\tIndented']);
    });
});

describe('no leading whitespace (stage direction, as in the app)', () => {
    it('strips the space Enter leaves in a stage direction', async () => {
        renderEditor('stageDirection', 'pq rs', true);

        const editor = await placeCaret(await getEditor(), 2);

        await userEvent.keyboard('{Enter}');

        expect(blockTexts(editor).some(text => text.startsWith(' '))).toBe(false);
        expect(blockTexts(editor).join('')).toBe('pqrs');
    });

    it('strips the space two Backspaces leave in a stage direction', async () => {
        renderEditor('stageDirection', 'ab cd', true);

        const editor = await placeCaret(await getEditor(), 2);

        await userEvent.keyboard('{Backspace}{Backspace}');

        expect(blockTexts(editor)).toEqual(['cd']);
    });
});

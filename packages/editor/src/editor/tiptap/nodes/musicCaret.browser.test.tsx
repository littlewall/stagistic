import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type MusicCaretTestWindow = Window & {__musicCaretTestEditor?: Editor | null};

const createStageDirection = (id: string, content: ScriptNode[] = []): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content,
});

const createDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [createStageDirection('sd-1', [{type: 'text', text: 'Fade'}]), createStageDirection('sd-2')],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as MusicCaretTestWindow).__musicCaretTestEditor = editor;

        return () => {
            delete (window as MusicCaretTestWindow).__musicCaretTestEditor;
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
        <ScriptEditor document={{initialValue: createDocument()}} layout={{autoFocus: true}}>
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
    () => (window as MusicCaretTestWindow).__musicCaretTestEditor ?? null,
    'editor instance',
);

const clickAfterPill = async (pill: Element) => {
    const block = pill.closest<HTMLElement>('[data-id]');

    if (!block) {
        throw new Error('Music block not found');
    }

    const blockRect = block.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();

    await page.elementLocator(block).click({
        position: {
            x: Math.min(blockRect.width - 2, pillRect.right - blockRect.left + 4),
            y: pillRect.top - blockRect.top + (pillRect.height / 2),
        },
    });
};

const findMusicPosition = (editor: Editor): number | null => {
    let musicPos: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'musicStart' || node.type.name === 'musicOut') {
            musicPos = pos;

            return false;
        }

        return true;
    });

    return musicPos;
};

const findBlockStart = (editor: Editor, blockId: string): number | null => {
    let blockStart: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (node.attrs.id === blockId) {
            blockStart = pos + 1;

            return false;
        }

        return true;
    });

    return blockStart;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('music pill caret placement', () => {
    it('moves a click after a music start before the pill', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const pill = await poll(
            () => document.querySelector('[data-music-pill="start"]'),
            'music start pill',
        );
        const musicPos = findMusicPosition(editor);
        const selectionPositions: number[] = [];
        const handleTransaction = ({transaction}: {transaction: Transaction}) => {
            if (transaction.selectionSet) {
                selectionPositions.push(transaction.selection.from);
            }
        };

        editor.on('transaction', handleTransaction);
        await clickAfterPill(pill);
        editor.off('transaction', handleTransaction);

        expect(editor.state.selection.from).toBe(musicPos);
        expect(selectionPositions.length).toBeGreaterThan(0);
        expect(selectionPositions.every(position => position === musicPos)).toBe(true);
        expect(document.querySelector('[data-music-menu="start"]')).toBeNull();

        await userEvent.keyboard('X');

        const stageDirection = editor.getJSON().content?.[0] as ScriptNode | undefined;

        expect(stageDirection?.content?.map(node => node.type)).toEqual(['text', 'musicStart']);
        expect(stageDirection?.content?.[0]?.text?.endsWith('X')).toBe(true);
    });

    it('moves a click after a music out before the pill', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicOut('sd-2');

        const pill = await poll(
            () => document.querySelector('[data-music-pill="out"]'),
            'music out pill',
        );
        const musicPos = findMusicPosition(editor);

        await clickAfterPill(pill);

        expect(editor.state.selection.from).toBe(musicPos);
        expect(document.querySelector('[data-music-menu="out"]')).toBeNull();
    });

    it('moves ArrowRight from before a music to the next block', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const musicPos = findMusicPosition(editor);
        const nextBlockStart = findBlockStart(editor, 'sd-2');

        if (musicPos === null || nextBlockStart === null) {
            throw new Error('Music or next block not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(
            TextSelection.create(editor.state.doc, musicPos),
        ));
        editor.commands.focus();

        await userEvent.keyboard('{ArrowRight}');

        expect(editor.state.selection.from).toBe(nextBlockStart);
        expect(editor.state.selection.empty).toBe(true);
        expect(document.activeElement).toBe(editor.view.dom);
    });

    it('keeps ArrowRight before a music in the final block', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-2', 'Night');

        const musicPos = findMusicPosition(editor);

        if (musicPos === null) {
            throw new Error('Music not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(
            TextSelection.create(editor.state.doc, musicPos),
        ));
        editor.commands.focus();

        await userEvent.keyboard('{ArrowRight}');

        expect(editor.state.selection.from).toBe(musicPos);
        expect(document.activeElement).toBe(editor.view.dom);
    });

    it('normalizes a programmatic caret after a music to before the pill', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const musicPos = findMusicPosition(editor);

        if (musicPos === null) {
            throw new Error('Music not found');
        }

        const music = editor.state.doc.nodeAt(musicPos);

        if (!music) {
            throw new Error('Music node not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(
            TextSelection.create(editor.state.doc, musicPos + music.nodeSize),
        ));

        expect(editor.state.selection.from).toBe(musicPos);
    });

    it('moves ArrowLeft directly before a music in the previous block', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const musicPos = findMusicPosition(editor);
        const nextBlockStart = findBlockStart(editor, 'sd-2');

        if (musicPos === null || nextBlockStart === null) {
            throw new Error('Music or next block not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(
            TextSelection.create(editor.state.doc, nextBlockStart),
        ));
        editor.commands.focus();

        const selectionPositions: number[] = [];
        const handleTransaction = ({transaction}: {transaction: Transaction}) => {
            if (transaction.selectionSet) {
                selectionPositions.push(transaction.selection.from);
            }
        };

        editor.on('transaction', handleTransaction);
        await userEvent.keyboard('{ArrowLeft}');
        editor.off('transaction', handleTransaction);

        expect(editor.state.selection.from).toBe(musicPos);
        expect(selectionPositions).toEqual([musicPos]);
    });

    it('keeps the music title out of sequential keyboard focus', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const title = await poll(
            () => document.querySelector<HTMLElement>('[data-music-title-input="start"]'),
            'music title',
        );

        expect(title.tabIndex).toBe(-1);
    });
});

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

import {useEditorInstance} from '../../../../context';
import ScriptEditor from '../../../../Editor';

/*
 * Regression oracle for the pagination refactor: the editor must drive the
 * shared @stagistic/script-pagination core and produce byte-for-byte the same
 * page boundaries it produced before. This snapshots PaginationExtension's
 * `state.pages` for a multi-page document that exercises orphan pushdown
 * (scene/character headings near a boundary) and a mid-block split (long
 * dialogue). If the refactor changes any startPos/endPos/startOffset/endOffset,
 * this snapshot must change — which means the adapter is not equivalent.
 */

interface PageInfoLike {
    index: number,
    startPos: number,
    endPos: number,
    startOffset: number,
    endOffset: number,
}

type GoldenWindow = Window & {__paginationGoldenEditor?: Editor | null};

const paragraph = (sentences: number): string => Array.from({length: sentences}, () => 'The quick brown fox jumps over the lazy dog.').join(' ');

const block = (type: string, id: string, textValue: string): ScriptNode => ({
    type,
    attrs: {id, blockType: type},
    content: textValue ? [{type: 'text', text: textValue}] : [],
});

const createGoldenDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('scene', 'scene-1', 'Scene One'),
        block('character', 'char-1', 'ALICE'),
        block('dialogue', 'dlg-1', paragraph(40)),
        block('character', 'char-2', 'BOB'),
        block('dialogue', 'dlg-2', paragraph(40)),
        block('scene', 'scene-2', 'Scene Two'),
        block('character', 'char-3', 'CAROL'),
        block('dialogue', 'dlg-3', paragraph(20)),
    ],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as GoldenWindow).__paginationGoldenEditor = editor;

        return () => {
            delete (window as GoldenWindow).__paginationGoldenEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = () => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue: createGoldenDocument(), persistentCharacters: []}}
            layout={{autoFocus: true}}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );

    mountedRoots.push(root);
};

const sleep = (ms: number) => new Promise(resolve => {
    window.setTimeout(resolve, ms);
});

const getEditor = async (): Promise<Editor> => {
    const deadline = Date.now() + 3000;

    while (Date.now() < deadline) {
        const editor = (window as GoldenWindow).__paginationGoldenEditor;

        if (editor) {
            return editor;
        }

        await sleep(20);
    }

    throw new Error('Timed out waiting for editor instance');
};

const readPages = (editor: Editor): PageInfoLike[] | null => {
    const storage = editor.storage as Record<string, {state?: {pages?: PageInfoLike[]}}>;

    return storage.Pagination?.state?.pages ?? null;
};

/*
 * Pagination recalc is asynchronous (rAF + ResizeObserver + fonts.ready) and
 * re-runs while inline breaks are present, so poll until the page list settles
 * to the same value across several reads.
 */
const pollStablePages = async (editor: Editor): Promise<PageInfoLike[]> => {
    const deadline = Date.now() + 6000;
    let serializedPrevious = '';
    let stableReads = 0;
    let latest: PageInfoLike[] = [];

    while (Date.now() < deadline) {
        const pages = readPages(editor);

        if (pages && pages.length >= 3) {
            latest = pages;

            const serialized = JSON.stringify(pages);

            if (serialized === serializedPrevious) {
                stableReads += 1;

                if (stableReads >= 3) {
                    return pages;
                }
            } else {
                stableReads = 0;
                serializedPrevious = serialized;
            }
        }

        await sleep(60);
    }

    return latest;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('pagination golden', () => {
    it('produces stable multi-page boundaries for a heading + long-dialogue document', async () => {
        renderEditor();

        const editor = await getEditor();

        await sleep(2000);

        const storage = editor.storage as Record<string, {state?: {pages?: PageInfoLike[], pageCount?: number}}>;

        throw new Error(`DIAGNOSTIC storageKeys=${JSON.stringify(Object.keys(editor.storage))} `
            + `paginationState=${JSON.stringify(storage.Pagination?.state ?? null)}`);

        const pages = await pollStablePages(editor);

        expect(pages.length).toBeGreaterThanOrEqual(3);
        expect(pages).toMatchInlineSnapshot();
    });
});

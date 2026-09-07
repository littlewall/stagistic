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
import {paginationKey} from '../plugin/createPaginationPlugin';

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
        block('dialogue', 'dlg-1', paragraph(80)),
        block('character', 'char-2', 'BOB'),
        block('dialogue', 'dlg-2', paragraph(80)),
        block('scene', 'scene-2', 'Scene Two'),
        block('character', 'char-3', 'CAROL'),
        block('dialogue', 'dlg-3', paragraph(60)),
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

/*
 * These specs never loaded tokens.css, so the editor's old read of --size-scale
 * fell back to 1. editorZoom={1} states that explicitly now that the value is a
 * prop rather than an ambient global.
 */
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
            editorZoom={1}
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
    return paginationKey.getState(editor.state)?.pagination?.pages ?? null;
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

        const dividerDeadline = Date.now() + 3000;

        while (Date.now() < dividerDeadline && !document.querySelector('[data-pagination-divider="true"]')) {
            await sleep(25);
        }

        const pages = await pollStablePages(editor);
        const editorRoot = document.querySelector<HTMLElement>('[data-editor-ready]');
        const cssPageHeight = Number.parseFloat(
            editorRoot?.style.getPropertyValue('--editor-page-height') ?? '',
        );
        const paginationPageHeight = paginationKey.getState(editor.state)?.pagination.pageHeight;

        expect(paginationPageHeight).toBeCloseTo(cssPageHeight);
        expect(pages.length).toBeGreaterThanOrEqual(3);
        expect(pages).toMatchInlineSnapshot(`
          [
            {
              "endOffset": 896.9290680100754,
              "endPos": 18,
              "index": 1,
              "startOffset": 0,
              "startPos": 0,
            },
            {
              "endOffset": 1793.8581360201506,
              "endPos": 3624,
              "index": 2,
              "startOffset": 896.9290680100754,
              "startPos": 18,
            },
            {
              "endOffset": 2690.787204030226,
              "endPos": 3624,
              "index": 3,
              "startOffset": 1793.8581360201506,
              "startPos": 3624,
            },
            {
              "endOffset": 3587.716272040301,
              "endPos": 7243,
              "index": 4,
              "startOffset": 2690.787204030226,
              "startPos": 3624,
            },
            {
              "endOffset": 4407.971083123424,
              "endPos": 9944,
              "index": 5,
              "startOffset": 3587.716272040301,
              "startPos": 7243,
            },
          ]
        `);
    });
});

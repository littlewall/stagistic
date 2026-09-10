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
 * shared @stagistic/script-pagination core and produce the same page boundaries
 * it produced before. This snapshots PaginationExtension's `state.pages` for a
 * multi-page document that exercises orphan pushdown (scene/character headings
 * near a boundary) and a mid-block split (long dialogue). If the refactor
 * changes any startPos/endPos, or moves an offset relative to the page height,
 * this snapshot must change — which means the adapter is not equivalent.
 *
 * Offsets are recorded as multiples of the page height rather than raw pixels.
 * `useResponsiveScale` derives the page geometry from the available canvas
 * width, so unrelated chrome CSS (the toolbar rail width) rescales every offset
 * by one uniform factor without touching a single page boundary. The ratios are
 * invariant under that scale, so they keep this a real oracle for the adapter
 * instead of a tripwire for every CSS tweak.
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

/*
 * 4 decimals resolves to well under a tenth of a pixel at any realistic page
 * height, while absorbing float noise from the division.
 */
const inPages = (offset: number, pageHeight: number) => Math.round(
    (offset / pageHeight) * 1e4,
) / 1e4;

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
 * These specs never loaded tokens.css, so the editor's old read of the UI density
 * coefficient fell back to 1. editorZoom={1} states that explicitly now that the
 * value is a prop rather than an ambient global.
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

        if (!paginationPageHeight) {
            throw new Error('Pagination page height is unavailable');
        }

        expect(paginationPageHeight).toBeCloseTo(cssPageHeight);
        expect(pages.length).toBeGreaterThanOrEqual(3);
        expect(pages.map(page => ({
            endOffsetInPages: inPages(page.endOffset, paginationPageHeight),
            endPos: page.endPos,
            index: page.index,
            startOffsetInPages: inPages(page.startOffset, paginationPageHeight),
            startPos: page.startPos,
        }))).toMatchInlineSnapshot(`
          [
            {
              "endOffsetInPages": 1,
              "endPos": 18,
              "index": 1,
              "startOffsetInPages": 0,
              "startPos": 0,
            },
            {
              "endOffsetInPages": 2,
              "endPos": 3624,
              "index": 2,
              "startOffsetInPages": 1,
              "startPos": 18,
            },
            {
              "endOffsetInPages": 3,
              "endPos": 3624,
              "index": 3,
              "startOffsetInPages": 2,
              "startPos": 3624,
            },
            {
              "endOffsetInPages": 4,
              "endPos": 7243,
              "index": 4,
              "startOffsetInPages": 3,
              "startPos": 3624,
            },
            {
              "endOffsetInPages": 4.9145,
              "endPos": 9944,
              "index": 5,
              "startOffsetInPages": 4,
              "startPos": 7243,
            },
          ]
        `);
    });
});

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
 * Collapsing a scene is allowed to move content onto different pages, but the
 * page itself is a fixed sheet: the gap between two page dividers must stay the
 * same before and after the collapse. Hidden blocks used to keep their last
 * measured height, which ate into the spacer that pads a page out to full
 * height, and the editor rendered visibly short pages.
 */

type CollapseWindow = Window & {__collapsePaginationEditor?: Editor | null};

const paragraph = (sentences: number): string => Array.from(
    {length: sentences},
    () => 'The quick brown fox jumps over the lazy dog.',
).join(' ');

const block = (type: string, id: string, textValue: string): ScriptNode => ({
    type,
    attrs: {id, blockType: type},
    content: textValue ? [{type: 'text', text: textValue}] : [],
});

const createDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('scene', 'scene-1', 'Scene One'),
        block('character', 'char-1', 'ALICE'),
        block('dialogue', 'dlg-1', paragraph(60)),
        block('scene', 'scene-2', 'Scene Two'),
        block('character', 'char-2', 'BOB'),
        block('dialogue', 'dlg-2', paragraph(80)),
        block('scene', 'scene-3', 'Scene Three'),
        block('character', 'char-3', 'CAROL'),
        block('dialogue', 'dlg-3', paragraph(80)),
    ],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as CollapseWindow).__collapsePaginationEditor = editor;

        return () => {
            delete (window as CollapseWindow).__collapsePaginationEditor;
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
            document={{initialValue: createDocument(), persistentCharacters: []}}
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
        const editor = (window as CollapseWindow).__collapsePaginationEditor;

        if (editor) {
            return editor;
        }

        await sleep(20);
    }

    throw new Error('Timed out waiting for editor instance');
};

const readDividerTops = (): number[] => {
    const dividers = document.querySelectorAll<HTMLElement>('[data-pagination-divider="true"]');

    return [...dividers].map(divider => divider.getBoundingClientRect().top);
};

/*
 * Recalc is asynchronous (rAF + ResizeObserver + fonts.ready) and re-runs while
 * fallback measurements or inline breaks are pending, so read the divider
 * positions until they repeat.
 */
const pollStableDividerTops = async (minimum: number): Promise<number[]> => {
    const deadline = Date.now() + 6000;
    let serializedPrevious = '';
    let stableReads = 0;
    let latest: number[] = [];

    while (Date.now() < deadline) {
        const tops = readDividerTops();

        if (tops.length >= minimum) {
            latest = tops;

            const serialized = tops.map(top => Math.round(top)).join('|');

            if (serialized === serializedPrevious) {
                stableReads += 1;

                if (stableReads >= 3) {
                    return tops;
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

const gaps = (tops: number[]): number[] => tops
    .slice(1)
    .map((top, index) => top - tops[index]);

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('pagination with a collapsed scene', () => {
    it('keeps the rendered page height fixed after collapsing a scene', async () => {
        renderEditor();

        const editor = await getEditor();
        const beforeTops = await pollStableDividerTops(3);
        const beforeGaps = gaps(beforeTops);

        expect(beforeGaps.length).toBeGreaterThanOrEqual(2);
        beforeGaps.forEach(gap => {
            expect(gap).toBeCloseTo(beforeGaps[0], 0);
        });

        expect(editor.commands.toggleSceneCollapsed('scene-2')).toBe(true);

        const afterTops = await pollStableDividerTops(2);
        const afterGaps = gaps(afterTops);

        expect(afterGaps.length).toBeGreaterThanOrEqual(1);
        afterGaps.forEach(gap => {
            expect(gap).toBeCloseTo(beforeGaps[0], 0);
        });
    });
});

import type {Editor as TiptapEditor} from '@tiptap/react';
import {useMemo} from 'react';

import type {PageInfo} from '../tiptap/extensions/pagination/types';
import {isScriptBlockNodeName} from '../tiptap/scriptCore';
import {
    type PageStructureMark,
    resolvePageStructureMarks,
    type StructureBlockPos,
} from './resolvePageStructureMarks';

export const usePageStructureMarks = (
    editor: TiptapEditor | null,
    pages: readonly PageInfo[],
): PageStructureMark[] => {
    return useMemo(() => {
        if (!editor) {
            return [];
        }

        const blocks: StructureBlockPos[] = [];

        editor.state.doc.forEach((node, offset) => {
            if (!isScriptBlockNodeName(node.type.name)) {
                return;
            }

            blocks.push({
                pos: offset,
                blockType: (node.attrs as {blockType?: string}).blockType,
            });
        });

        /*
         * `pages` is a fresh array on every pagination recalc (which follows any doc
         * change), so this recomputes exactly when the layout or structure changes.
         */
        return resolvePageStructureMarks(blocks, pages.map(page => ({startPos: page.startPos})));
    }, [editor, pages]);
};

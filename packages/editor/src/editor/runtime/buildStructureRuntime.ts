import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {EditorLiveStructureSnapshot} from '../contracts';
import {buildStructureSnapshotFromBlocks} from '../live/buildSidebarProjectionFromIndex';
import {EMPTY_STRUCTURE} from '../live/store';
import {
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../tiptap/scriptCore';

export const buildStructureRuntime = (doc: ProseMirrorNode): EditorLiveStructureSnapshot => {
    const blocks: {
        blockId: string, blockType: string, textContent: string,
    }[] = [];

    try {
        doc.descendants(node => {
            if (!isScriptBlockNodeName(node.type.name)) {
                return true;
            }

            const blockType = normalizeBlockNodeType(node.attrs.blockType);
            const blockId = typeof node.attrs.id === 'string'
                ? node.attrs.id.trim()
                : '';

            if (!blockId) {
                return false;
            }

            blocks.push({
                blockId, blockType, textContent: node.textContent,
            });

            return false;
        });
    } catch {
        return EMPTY_STRUCTURE;
    }

    return buildStructureSnapshotFromBlocks(blocks);
};

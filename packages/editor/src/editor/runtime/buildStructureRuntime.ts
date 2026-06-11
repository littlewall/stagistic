import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {EditorLiveStructureSnapshot} from '../contracts';
import {buildStructureSnapshotFromBlocks} from '../live/buildSidebarProjectionFromIndex';
import {EMPTY_STRUCTURE} from '../live/store';
import {
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';

export const buildStructureRuntime = (doc: ProseMirrorNode): EditorLiveStructureSnapshot => {
    const blocks: {
        blockId: string, blockType: string, textContent: string,
    }[] = [];

    try {
        doc.descendants(node => {
            if (!isFountainBlockNodeName(node.type.name)) {
                return true;
            }

            const blockType = normalizeFountainBlockType(node.attrs.blockType);
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

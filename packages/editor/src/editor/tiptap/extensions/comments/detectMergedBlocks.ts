import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {Mapping} from '@tiptap/pm/transform';

import type {CommentBlockMerge} from './types';

interface BlockSpan {
    id: string;
    pos: number;
    size: number;
}

const collectBlocks = (doc: ProseMirrorNode) => {
    const blocks: BlockSpan[] = [];

    doc.descendants((node, pos) => {
        if (node.isTextblock && typeof node.attrs.id === 'string') {
            blocks.push({id: node.attrs.id, pos, size: node.content.size});

            return false;
        }

        return true;
    });

    return blocks;
};

const findBlockIdAt = (doc: ProseMirrorNode, pos: number): string | null => {
    const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));

    for (let depth = $pos.depth; depth > 0; depth -= 1) {
        const node = $pos.node(depth);

        if (node.isTextblock && typeof node.attrs.id === 'string') {
            return node.attrs.id;
        }
    }

    return null;
};

/*
 * A vanished block whose last content position survived the transaction was
 * joined into another block; a block deleted whole leaves nothing behind.
 */
export const detectMergedBlocks = (before: ProseMirrorNode, after: ProseMirrorNode, mapping: Pick<Mapping, 'mapResult'>): CommentBlockMerge[] => {
    const afterIds = new Set(collectBlocks(after).map(block => block.id));
    const merges: CommentBlockMerge[] = [];

    collectBlocks(before).forEach(block => {
        if (afterIds.has(block.id) || block.size === 0) {
            return;
        }

        const result = mapping.mapResult(block.pos + block.size, -1);

        if (result.deletedBefore) {
            return;
        }

        const toBlockId = findBlockIdAt(after, result.pos);

        if (toBlockId && toBlockId !== block.id) {
            merges.push({fromBlockId: block.id, toBlockId});
        }
    });

    return merges;
};

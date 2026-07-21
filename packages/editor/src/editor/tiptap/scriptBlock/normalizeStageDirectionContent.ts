import {
    CHARACTER_TAG_MARK_NAME,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import type {Node as ProseMirrorNode, Schema} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';

import type {BlockNodeType} from '../scriptCore';

const readMusicNodeText = (node: ProseMirrorNode): string => {
    if (node.type.name === MUSIC_OUT_NODE_NAME) {
        return 'out';
    }

    const title: unknown = node.attrs[MUSIC_TITLE_ATTR];

    return typeof title === 'string' ? title : '';
};

const musicNodeToText = (
    node: ProseMirrorNode,
    previousNode: ProseMirrorNode | null,
    nextNode: ProseMirrorNode | null,
): string => {
    const text = readMusicNodeText(node);

    if (!text) {
        return '';
    }

    const prefix =
        previousNode && !(/\s$/u).test(previousNode.textContent) && !(/^\s/u).test(text) ? ' ' : '';
    const suffix = nextNode && !(/^\s/u).test(nextNode.textContent) && !(/\s$/u).test(text) ? ' ' : '';

    return `${prefix}${text}${suffix}`;
};

const isMusicNode = (node: ProseMirrorNode) => {
    return node.type.name === MUSIC_START_NODE_NAME || node.type.name === MUSIC_OUT_NODE_NAME;
};

export const normalizeFormerStageDirectionContent = (
    tr: Transaction,
    schema: Schema,
    previousBlockType: BlockNodeType,
    nextBlockType: BlockNodeType,
    blockPos: number,
    blockNode: ProseMirrorNode,
): Transaction => {
    if (previousBlockType !== 'stageDirection' || nextBlockType === 'stageDirection') {
        return tr;
    }

    const characterTag = schema.marks[CHARACTER_TAG_MARK_NAME];
    const changes: Array<() => void> = [];

    blockNode.forEach((child, offset, index) => {
        const from = blockPos + 1 + offset;
        const to = from + child.nodeSize;

        if (characterTag && child.marks.some(mark => mark.type === characterTag)) {
            changes.push(() => {
                tr.removeMark(tr.mapping.map(from), tr.mapping.map(to), characterTag);
            });
        }

        if (isMusicNode(child)) {
            const previousNode = index > 0 ? blockNode.child(index - 1) : null;
            const nextNode = index + 1 < blockNode.childCount ? blockNode.child(index + 1) : null;

            changes.push(() => {
                const mappedFrom = tr.mapping.map(from);
                const mappedTo = tr.mapping.map(to);
                const text = musicNodeToText(child, previousNode, nextNode);

                if (!text) {
                    tr.delete(mappedFrom, mappedTo);

                    return;
                }

                tr.replaceWith(mappedFrom, mappedTo, schema.text(text));
            });
        }
    });

    changes.reverse().forEach(applyChange => applyChange());

    return tr;
};

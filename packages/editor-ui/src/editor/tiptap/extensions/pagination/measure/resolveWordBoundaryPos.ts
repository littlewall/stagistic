import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

export const resolveWordBoundaryPos = (
    blockNode: ProseMirrorNode,
    blockPos: number,
    breakPos: number,
): number => {
    const blockStart = blockPos + 1;
    const blockEnd = blockPos + blockNode.nodeSize - 1;
    const isWhitespace = (value: string) => (/\s/).test(value);
    let nearestBefore: number | null = null;
    let nearestAfter: number | null = null;

    blockNode.nodesBetween(0, blockNode.content.size, (node, pos) => {
        if (!node.isText) {
            return true;
        }

        const text = node.text ?? '';

        for (let i = 0; i < text.length; i += 1) {
            if (!isWhitespace(text[i])) {
                continue;
            }

            const boundaryPos = blockStart + pos + i + 1;

            if (boundaryPos <= breakPos) {
                if (nearestBefore === null || boundaryPos > nearestBefore) {
                    nearestBefore = boundaryPos;
                }

                continue;
            }

            if (nearestAfter === null || boundaryPos < nearestAfter) {
                nearestAfter = boundaryPos;
            }
        }

        return true;
    });

    const candidate = nearestBefore ?? nearestAfter;

    if (candidate === null) {
        return breakPos;
    }

    return Math.min(Math.max(candidate, blockStart), blockEnd);
};

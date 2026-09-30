import type {ExtractedBlockRow} from '../../../blocks';

const serializeRefByKey = (refByKey: Record<string, string>): string => {
    return Object.entries(refByKey)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, id]) => `${key}:${id}`)
        .join('|');
};

export const nonOrderFieldsDiffer = (prev: ExtractedBlockRow | undefined, next: ExtractedBlockRow): boolean => {
    if (!prev) {
        return true;
    }

    return (
        prev.blockType !== next.blockType ||
        prev.textContent !== next.textContent ||
        prev.contentJson !== next.contentJson ||
        prev.sceneHeadingBlockId !== next.sceneHeadingBlockId ||
        prev.actHeadingBlockId !== next.actHeadingBlockId
    );
};

export const refsDiffer = (prev: ExtractedBlockRow | undefined, next: ExtractedBlockRow): boolean => {
    if (!prev) {
        return true;
    }

    return serializeRefByKey(prev.characterRefByKey) !== serializeRefByKey(next.characterRefByKey);
};

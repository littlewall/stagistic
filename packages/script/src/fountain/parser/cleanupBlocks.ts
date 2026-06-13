import {
    ELEMENT_CHARACTER,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainElement,
} from '../types';

export const isEmptyActionBlock = (block: FountainElement) => block.type === ELEMENT_STAGE_DIRECTIONS
    && block.children.length > 0
    && block.children[0].text.trim().length === 0;

export const removeRedundantEmptyActions = (blocks: FountainElement[]) => {
    const cleaned: FountainElement[] = [];

    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];

        if (isEmptyActionBlock(block)) {
            let nextNonEmptyType = null;

            for (let j = i + 1; j < blocks.length; j += 1) {
                if (!isEmptyActionBlock(blocks[j])) {
                    nextNonEmptyType = blocks[j].type;
                    break;
                }
            }

            if (nextNonEmptyType === ELEMENT_CHARACTER) {
                continue;
            }
        }

        cleaned.push(block);
    }

    return cleaned;
};

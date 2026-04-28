import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_TRANSITION,
    type FountainElement,
    type FountainElementType,
} from '../types';

export const isEmptyActionBlock = (block: FountainElement) => block.type === ELEMENT_ACTION
    && block.children.length > 0
    && block.children[0].text.trim().length === 0;

export const removeRedundantEmptyActions = (blocks: FountainElement[]) => {
    const cleaned: FountainElement[] = [];
    let previousNonEmptyType: FountainElementType | null = null;

    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];

        if (isEmptyActionBlock(block)) {
            let nextNonEmptyType: FountainElementType | null = null;

            for (let j = i + 1; j < blocks.length; j += 1) {
                if (!isEmptyActionBlock(blocks[j])) {
                    nextNonEmptyType = blocks[j].type;
                    break;
                }
            }

            if (nextNonEmptyType === ELEMENT_CHARACTER) {
                continue;
            }

            if (
                previousNonEmptyType === ELEMENT_TRANSITION
                || nextNonEmptyType === ELEMENT_TRANSITION
            ) {
                continue;
            }
        }

        cleaned.push(block);

        if (!isEmptyActionBlock(block)) {
            previousNonEmptyType = block.type;
        }
    }

    return cleaned;
};

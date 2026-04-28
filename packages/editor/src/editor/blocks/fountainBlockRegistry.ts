import {
    ELEMENT_ACT,
    FOUNTAIN_BLOCK_ITEMS,
    type FountainElementType,
} from '@stagistic/script';

export const FOUNTAIN_BLOCKS: {type: FountainElementType, label: string}[] = [
    ...FOUNTAIN_BLOCK_ITEMS.map(item => ({
        type: item.type,
        label: item.label,
    })),
];

export const FOUNTAIN_BLOCKS_WITHOUT_ACT = FOUNTAIN_BLOCKS.filter(block => block.type !== ELEMENT_ACT);

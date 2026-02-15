import {
    FOUNTAIN_BLOCK_ITEMS,
    type FountainElementType,
} from '@stagistic/script-core';

export const FOUNTAIN_BLOCKS: {type: FountainElementType, label: string}[] = [
    ...FOUNTAIN_BLOCK_ITEMS.map(item => ({
        type: item.type,
        label: item.label,
    })),
];

import {
    BLOCK_ITEMS,
    type ScriptBlockNodeType,
} from '@stagistic/script';

export const BLOCKS: {type: ScriptBlockNodeType, label: string}[] = [
    ...BLOCK_ITEMS.map(item => ({
        type: item.nodeType,
        label: item.label,
    })),
];

export const BLOCKS_WITHOUT_ACT = BLOCKS.filter(block => block.type !== 'act');

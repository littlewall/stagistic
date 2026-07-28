import {
    type BlockCasing,
    type BlockSettings,
    type BlockShortcut,
    isBlockShortcut,
} from '@stagistic/script';

import {BLOCK_NODE_TYPES, type BlockNodeType} from '../blocks/script';
import {normalizeBlockNodeType} from '../tiptap/scriptCore';

type BlockShortcutOptions = Partial<Record<BlockNodeType, BlockShortcut>>;
type BlockNextElementOptions = Partial<Record<BlockNodeType, BlockNodeType>>;
type BlockCasingOptions = Partial<Record<BlockNodeType, BlockCasing>>;

export const getBlockShortcuts = (blocks: BlockSettings): BlockShortcutOptions => {
    const shortcuts: BlockShortcutOptions = {};

    for (const blockType of BLOCK_NODE_TYPES) {
        const shortcut = blocks[blockType]?.shortcut;

        if (isBlockShortcut(shortcut)) {
            shortcuts[blockType] = shortcut;
        }
    }

    return shortcuts;
};

export const getBlockNextElements = (blocks: BlockSettings): BlockNextElementOptions => {
    const nextElements: BlockNextElementOptions = {};

    for (const blockType of BLOCK_NODE_TYPES) {
        const nextElement = blocks[blockType]?.nextElement;

        if (typeof nextElement === 'string') {
            nextElements[blockType] = normalizeBlockNodeType(nextElement);
        }
    }

    return nextElements;
};

export const getBlockCasing = (blocks: BlockSettings): BlockCasingOptions => {
    const blockCasing: BlockCasingOptions = {};

    for (const blockType of BLOCK_NODE_TYPES) {
        const casing = blocks[blockType]?.casing;

        if (casing === 'normal' || casing === 'uppercase') {
            blockCasing[blockType] = casing;
        }
    }

    return blockCasing;
};

import {
    type BlockCasing,
    type BlockShortcut,
    type EditorSettings,
    isBlockShortcut,
} from '@stagistic/script';

import {BLOCK_NODE_TYPES, type BlockNodeType} from '../blocks/script';
import {normalizeBlockNodeType} from '../tiptap/scriptCore';

type BlockShortcutOptions = Partial<Record<BlockNodeType, BlockShortcut>>;
type BlockNextElementOptions = Partial<Record<BlockNodeType, BlockNodeType>>;
type BlockCasingOptions = Partial<Record<BlockNodeType, BlockCasing>>;

export const getBlockShortcuts = (resolvedSettings: EditorSettings): BlockShortcutOptions => {
    const shortcuts: BlockShortcutOptions = {};

    for (const blockType of BLOCK_NODE_TYPES) {
        const shortcut = resolvedSettings.blocks[blockType]?.shortcut;

        if (isBlockShortcut(shortcut)) {
            shortcuts[blockType] = shortcut;
        }
    }

    return shortcuts;
};

export const getBlockNextElements = (resolvedSettings: EditorSettings): BlockNextElementOptions => {
    const nextElements: BlockNextElementOptions = {};

    for (const blockType of BLOCK_NODE_TYPES) {
        const nextElement = resolvedSettings.blocks[blockType]?.nextElement;

        if (typeof nextElement === 'string') {
            nextElements[blockType] = normalizeBlockNodeType(nextElement);
        }
    }

    return nextElements;
};

export const getBlockCasing = (resolvedSettings: EditorSettings): BlockCasingOptions => {
    const blockCasing: BlockCasingOptions = {};

    for (const blockType of BLOCK_NODE_TYPES) {
        const casing = resolvedSettings.blocks[blockType]?.casing;

        if (casing === 'normal' || casing === 'uppercase') {
            blockCasing[blockType] = casing;
        }
    }

    return blockCasing;
};

import {
    type BlockCasing,
    type BlockShortcut,
    type EditorSettings,
    isBlockShortcut,
} from '@stagistic/script-core';

import {FOUNTAIN_BLOCK_TYPES, type FountainBlockType} from '../blocks/fountain';
import {normalizeFountainBlockType} from '../tiptap/fountainCore';

type BlockShortcutOptions = Partial<Record<FountainBlockType, BlockShortcut>>;
type BlockNextElementOptions = Partial<Record<FountainBlockType, FountainBlockType>>;
type BlockCasingOptions = Partial<Record<FountainBlockType, BlockCasing>>;

export const getBlockShortcuts = (resolvedSettings: EditorSettings): BlockShortcutOptions => {
    const shortcuts: BlockShortcutOptions = {};

    for (const blockType of FOUNTAIN_BLOCK_TYPES) {
        const shortcut = resolvedSettings.blocks[blockType]?.shortcut;

        if (isBlockShortcut(shortcut)) {
            shortcuts[blockType] = shortcut;
        }
    }

    return shortcuts;
};

export const getBlockNextElements = (resolvedSettings: EditorSettings): BlockNextElementOptions => {
    const nextElements: BlockNextElementOptions = {};

    for (const blockType of FOUNTAIN_BLOCK_TYPES) {
        const nextElement = resolvedSettings.blocks[blockType]?.nextElement;

        if (typeof nextElement === 'string') {
            nextElements[blockType] = normalizeFountainBlockType(nextElement);
        }
    }

    return nextElements;
};

export const getBlockCasing = (resolvedSettings: EditorSettings): BlockCasingOptions => {
    const blockCasing: BlockCasingOptions = {};

    for (const blockType of FOUNTAIN_BLOCK_TYPES) {
        const casing = resolvedSettings.blocks[blockType]?.casing;

        if (casing === 'normal' || casing === 'uppercase') {
            blockCasing[blockType] = casing;
        }
    }

    return blockCasing;
};

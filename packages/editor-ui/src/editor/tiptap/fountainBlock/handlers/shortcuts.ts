import {isApplePlatform} from '@stagistic/platform-core';
import {isBlockShortcut} from '@stagistic/script-core';
import type {Editor} from '@tiptap/react';

import {FOUNTAIN_BLOCK_TYPES} from '../../../blocks/fountain';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
    normalizeFountainBlockType,
} from '../../fountainCore';
import {updateBlockType} from '../commands';
import {type BlockShortcutMap} from './types';

const hasShortcutModifier = (event: KeyboardEvent) => {
    if (isApplePlatform()) {
        return event.metaKey && !event.ctrlKey;
    }

    return event.ctrlKey && !event.metaKey;
};

const findBlockTypeByShortcut = (
    shortcut: string,
    blockShortcuts?: BlockShortcutMap,
) => {
    if (!blockShortcuts) {
        return null;
    }

    for (const blockType of FOUNTAIN_BLOCK_TYPES) {
        if (blockShortcuts[blockType] === shortcut) {
            return normalizeFountainBlockType(blockType);
        }
    }

    return null;
};

export const handleBlockShortcut = (
    editor: Editor,
    event: KeyboardEvent,
    blockShortcuts?: BlockShortcutMap,
) => {
    if (event.altKey || event.shiftKey || !hasShortcutModifier(event)) {
        return false;
    }

    if (!isBlockShortcut(event.key)) {
        return false;
    }

    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    const nextType = findBlockTypeByShortcut(event.key, blockShortcuts);

    if (!nextType) {
        return false;
    }

    event.preventDefault();

    if (nextType === block.blockType) {
        return true;
    }

    return updateBlockType(editor, nextType, block.id);
};

import {
    ELEMENT_ACT,
    isBlockShortcut,
} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
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

/*
 * Alt+Enter cycles the active block to the next type (Shift reverses).
 * Alt+Enter is the same physical chord on macOS (Option+Enter) and
 * Windows, and is not reserved by either OS or by browsers.
 */
export const handleBlockTypeCycle = (editor: Editor, event: KeyboardEvent) => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!block) {
        return false;
    }

    event.preventDefault();

    // Acts are structural; they are managed via act commands, not cycling.
    if (block.blockType === ELEMENT_ACT) {
        return true;
    }

    const cycleTypes = FOUNTAIN_BLOCK_TYPES.filter(type => type !== ELEMENT_ACT);
    const currentIndex = cycleTypes.findIndex(type => type === block.blockType);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + direction + cycleTypes.length) % cycleTypes.length;
    const nextType = normalizeFountainBlockType(cycleTypes[nextIndex]);

    return updateBlockType(editor, nextType, block.id);
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

    if (block.blockType === ELEMENT_ACT && nextType !== ELEMENT_ACT) {
        return true;
    }

    if (nextType === block.blockType) {
        return true;
    }

    return updateBlockType(editor, nextType, block.id);
};

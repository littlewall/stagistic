import {
    isBlockShortcut,
} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import type {Editor} from '@tiptap/react';

import {BLOCK_NODE_TYPES} from '../../../blocks/script';
import {
    getActiveScriptBlockFromState,
    normalizeBlockNodeType,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../scriptCore';
import {updateBlockType} from '../commands';
import {type BlockShortcutMap} from './types';

const hasBlockShortcutModifier = (event: KeyboardEvent) => {
    if (event.shiftKey || event.metaKey) {
        return false;
    }

    if (isApplePlatform()) {
        /*
         * macOS: Control + digit. Option (⌥) is the character-composition
         * modifier — ⌥2 is "@", ⌥3 is "#", etc. on many layouts — so it must
         * NOT trigger block shortcuts, or those characters become untypable.
         * Cmd+digit is reserved by browsers (tab switching); Ctrl+digit is free.
         */
        return event.ctrlKey && !event.altKey;
    }

    /*
     * Windows/Linux: Alt + digit. Exclude AltGr (reported as Ctrl+Alt), which
     * is the character-composition modifier (AltGr+V = "@" on Czech layouts).
     */
    return event.altKey && !event.ctrlKey;
};

const getShortcutFromEvent = (event: KeyboardEvent) => {
    if (isBlockShortcut(event.key)) {
        return event.key;
    }

    const digitMatch = (/^Digit([0-9])$/).exec(event.code);
    const digit = digitMatch?.[1];

    return isBlockShortcut(digit) ? digit : null;
};

const findBlockTypeByShortcut = (
    shortcut: string,
    blockShortcuts?: BlockShortcutMap,
) => {
    if (!blockShortcuts) {
        return null;
    }

    for (const blockType of BLOCK_NODE_TYPES) {
        if (blockShortcuts[blockType] === shortcut) {
            return normalizeBlockNodeType(blockType);
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
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    event.preventDefault();

    // Acts are structural; they are managed via act commands, not cycling.
    if (block.blockType === 'act') {
        return true;
    }

    const cycleTypes = BLOCK_NODE_TYPES.filter(type => type !== 'act');
    const currentIndex = cycleTypes.findIndex(type => type === block.blockType);
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + direction + cycleTypes.length) % cycleTypes.length;
    const nextType = normalizeBlockNodeType(cycleTypes[nextIndex]);

    return updateBlockType(editor, nextType, block.id);
};

export const handleBlockShortcut = (
    editor: Editor,
    event: KeyboardEvent,
    blockShortcuts?: BlockShortcutMap,
) => {
    if (!hasBlockShortcutModifier(event)) {
        return false;
    }

    const shortcut = getShortcutFromEvent(event);

    if (!shortcut) {
        return false;
    }

    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block) {
        return false;
    }

    const nextType = findBlockTypeByShortcut(shortcut, blockShortcuts);

    if (!nextType) {
        return false;
    }

    event.preventDefault();

    if (block.blockType === 'act' && nextType !== 'act') {
        return true;
    }

    if (nextType === block.blockType) {
        return true;
    }

    return updateBlockType(editor, nextType, block.id);
};

import {
    extractCharacterKeys,
    normalizeCharacterKey,
} from '@stagistic/script';
import type {Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    type CharacterRefByKey,
    readNormalizedRefsFromAttrs,
    visitCharacterBlocks,
    writeRefsToNodeAttrs,
} from '../../characters/characterRefUtils';
import {runCharacterRefRenameCommand} from './characterRefRenameCommand';

const getNodeTextContent = (node: {textContent?: string | null}): string => {
    return node.textContent ?? '';
};

/**
 * Links a character key to a character ID across all matching character blocks in the document.
 * This is used when confirming a character.
 */
export const linkCharacterRef = (
    editor: Editor,
    characterKey: string,
    characterId: string,
): boolean => {
    const normalizedKey = normalizeCharacterKey(characterKey);

    if (!normalizedKey || !characterId) {
        return false;
    }

    const {state} = editor;
    let tr: Transaction = state.tr;
    let hasChanges = false;

    visitCharacterBlocks({
        doc: state.doc,
        onCharacterBlock: (node, pos) => {
            const text = getNodeTextContent(node);
            const keys = extractCharacterKeys(text);

            if (!keys.includes(normalizedKey)) {
                return false;
            }

            const attrs = node.attrs as Record<string, unknown>;
            const currentRefs = readNormalizedRefsFromAttrs(attrs);

            if (currentRefs[normalizedKey] === characterId) {
                return false;
            }

            const nextRefs: CharacterRefByKey = {
                ...currentRefs,
                [normalizedKey]: characterId,
            };

            tr = tr.setNodeMarkup(pos, undefined, writeRefsToNodeAttrs(attrs, nextRefs));
            hasChanges = true;

            return false;
        },
    });

    if (!hasChanges) {
        return false;
    }

    editor.view.dispatch(tr);

    return true;
};

/**
 * Unlinks a character ID from all character blocks in the document.
 * This is used when deleting a character.
 */
export const unlinkCharacterRef = (
    editor: Editor,
    characterId: string,
): boolean => {
    if (!characterId) {
        return false;
    }

    const {state} = editor;
    let tr: Transaction = state.tr;
    let hasChanges = false;

    visitCharacterBlocks({
        doc: state.doc,
        onCharacterBlock: (node, pos) => {
            const attrs = node.attrs as Record<string, unknown>;
            const currentRefs = readNormalizedRefsFromAttrs(attrs);
            const hasRef = Object.values(currentRefs).includes(characterId);

            if (!hasRef) {
                return false;
            }

            const nextRefs: CharacterRefByKey = {};

            Object.entries(currentRefs).forEach(([key, id]) => {
                if (id !== characterId) {
                    nextRefs[key] = id;
                }
            });

            tr = tr.setNodeMarkup(pos, undefined, writeRefsToNodeAttrs(attrs, nextRefs));
            hasChanges = true;

            return false;
        },
    });

    if (!hasChanges) {
        return false;
    }

    editor.view.dispatch(tr);

    return true;
};

/**
 * Replaces one character ID with another across all character blocks.
 * This is used when renaming results in a different character ID.
 */
export const replaceCharacterRefId = (
    editor: Editor,
    oldCharacterId: string,
    newCharacterId: string,
): boolean => {
    if (!oldCharacterId || !newCharacterId || oldCharacterId === newCharacterId) {
        return false;
    }

    const {state} = editor;
    let tr: Transaction = state.tr;
    let hasChanges = false;

    visitCharacterBlocks({
        doc: state.doc,
        onCharacterBlock: (node, pos) => {
            const attrs = node.attrs as Record<string, unknown>;
            const currentRefs = readNormalizedRefsFromAttrs(attrs);
            const hasOldRef = Object.values(currentRefs).includes(oldCharacterId);

            if (!hasOldRef) {
                return false;
            }

            const nextRefs: CharacterRefByKey = {};

            Object.entries(currentRefs).forEach(([key, id]) => {
                nextRefs[key] = id === oldCharacterId ? newCharacterId : id;
            });

            tr = tr.setNodeMarkup(pos, undefined, writeRefsToNodeAttrs(attrs, nextRefs));
            hasChanges = true;

            return false;
        },
    });

    if (!hasChanges) {
        return false;
    }

    editor.view.dispatch(tr);

    return true;
};

/**
 * Renames a confirmed character's text across all matching character blocks.
 * Matches blocks primarily by characterId in refs, then falls back to canonical key matching.
 * Updates both text content and refs in one transaction.
 */
export const renameCharacterText = (
    editor: Editor,
    characterId: string,
    newName: string,
    getCharacterNameForBlockType?: (name: string, blockType: unknown) => string,
    fallbackOldName?: string,
): boolean => {
    return runCharacterRefRenameCommand({
        editor,
        characterId,
        newName,
        getCharacterNameForBlockType,
        fallbackOldName,
    });
};

/**
 * Focuses the first character block matching the given key.
 * Returns true if a block was found and focused.
 */
export const focusFirstCharacterBlock = (
    editor: Editor,
    characterKey: string,
): boolean => {
    const normalizedKey = normalizeCharacterKey(characterKey);

    if (!normalizedKey) {
        return false;
    }

    let targetPos: number | null = null;

    visitCharacterBlocks({
        doc: editor.state.doc,
        onCharacterBlock: (node, pos) => {
            if (targetPos !== null) {
                return false;
            }

            const text = getNodeTextContent(node);
            const keys = extractCharacterKeys(text);

            if (keys.includes(normalizedKey)) {
                targetPos = pos;
            }

            return false;
        },
    });

    if (targetPos === null) {
        return false;
    }

    const focusPos = Number(targetPos) + 1;

    editor.commands.focus(focusPos);
    editor.commands.scrollIntoView();

    return true;
};

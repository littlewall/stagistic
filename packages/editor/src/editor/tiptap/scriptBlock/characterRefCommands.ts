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

    const {node} = editor.view.domAtPos(focusPos);
    const element = node instanceof Element ? node : node.parentElement;

    element?.scrollIntoView({block: 'center'});

    return true;
};

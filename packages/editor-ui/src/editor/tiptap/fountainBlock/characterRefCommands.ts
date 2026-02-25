import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    extractCharacterKeys,
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/script-core';
import type {Node as PMNode} from '@tiptap/pm/model';
import type {Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {isFountainBlockNodeName} from '../fountainCore';

type CharacterRefByKey = Record<string, string>;

/** Splits "NAME (V.O.)" into { base: "NAME", suffix: "(V.O.)" }. */
const splitTrailingParenthetical = (value: string): {base: string, suffix: string} => {
    const trimmed = value.trim();
    const match = (/\s*(\([^()]*\)\s*)+$/).exec(trimmed);

    if (!match) {
        return {base: trimmed, suffix: ''};
    }

    return {
        base: trimmed.slice(0, trimmed.length - match[0].length).trim(),
        suffix: match[0].trim(),
    };
};

const getNodeTextContent = (node: PMNode): string => {
    return node.textContent ?? '';
};

const getCharacterRefByKey = (attrs: Record<string, unknown> | null | undefined): CharacterRefByKey => {
    if (!attrs?.characterRefs || typeof attrs.characterRefs !== 'object') {
        return {};
    }

    return attrs.characterRefs as CharacterRefByKey;
};

const isCharacterBlock = (blockType: unknown): boolean => {
    return blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER;
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

    state.doc.descendants((node, pos) => {
        if (
            !isFountainBlockNodeName(node.type.name)
            || !node.attrs?.blockType
            || !isCharacterBlock(node.attrs.blockType)
        ) {
            return;
        }

        const text = getNodeTextContent(node);
        const keys = extractCharacterKeys(text);

        if (!keys.includes(normalizedKey)) {
            return;
        }

        const currentRefs = getCharacterRefByKey(node.attrs);

        if (currentRefs[normalizedKey] === characterId) {
            return;
        }

        const nextRefs = {
            ...currentRefs,
            [normalizedKey]: characterId,
        };

        tr = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            characterRefs: nextRefs,
        });

        hasChanges = true;
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

    state.doc.descendants((node, pos) => {
        if (
            !isFountainBlockNodeName(node.type.name)
            || !node.attrs?.blockType
            || !isCharacterBlock(node.attrs.blockType)
        ) {
            return;
        }

        const currentRefs = getCharacterRefByKey(node.attrs);
        const hasRef = Object.values(currentRefs).includes(characterId);

        if (!hasRef) {
            return;
        }

        const nextRefs: CharacterRefByKey = {};

        for (const [key, id] of Object.entries(currentRefs)) {
            if (id !== characterId) {
                nextRefs[key] = id;
            }
        }

        tr = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            characterRefs: nextRefs,
        });

        hasChanges = true;
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

    state.doc.descendants((node, pos) => {
        if (
            !isFountainBlockNodeName(node.type.name)
            || !node.attrs?.blockType
            || !isCharacterBlock(node.attrs.blockType)
        ) {
            return;
        }

        const currentRefs = getCharacterRefByKey(node.attrs);
        const hasOldRef = Object.values(currentRefs).includes(oldCharacterId);

        if (!hasOldRef) {
            return;
        }

        const nextRefs: CharacterRefByKey = {};

        for (const [key, id] of Object.entries(currentRefs)) {
            nextRefs[key] = id === oldCharacterId ? newCharacterId : id;
        }

        tr = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            characterRefs: nextRefs,
        });

        hasChanges = true;
    });

    if (!hasChanges) {
        return false;
    }

    editor.view.dispatch(tr);

    return true;
};

/**
 * Renames a confirmed character's text across all matching character blocks.
 * Matches blocks primarily by characterId in refs (fast path for linked blocks).
 * Also renames unlinked blocks whose text key matches the canonical old key
 * derived from linked blocks — mirroring renameCharacterInScriptDocument.
 * Updates BOTH the text content AND the characterRefs atomically.
 */
export const renameCharacterText = (
    editor: Editor,
    characterId: string,
    newName: string,
    getCharacterNameForBlockType?: (name: string, blockType: unknown) => string,
): boolean => {
    const normalizedNewName = newName.trim();

    if (!characterId || !normalizedNewName) {
        return false;
    }

    const {state} = editor;

    /*
     * Phase 1: find the canonical old key from any linked block
     * (the key currently in characterRefs that maps to this characterId)
     */
    let canonicalOldKey: string | null = null;

    state.doc.descendants(node => {
        if (canonicalOldKey !== null) {
            return false;
        }

        if (
            !isFountainBlockNodeName(node.type.name)
            || !node.attrs?.blockType
            || !isCharacterBlock(node.attrs.blockType)
        ) {
            return;
        }

        const refs = getCharacterRefByKey(node.attrs);
        const entry = Object.entries(refs).find(([, id]) => id === characterId);

        if (entry) {
            canonicalOldKey = entry[0];
        }
    });

    interface PendingChange {
        pos: number,
        contentSize: number,
        newText: string,
        newRefs: CharacterRefByKey,
        nodeAttrs: Record<string, unknown>,
    }

    const changes: PendingChange[] = [];

    state.doc.descendants((node, pos) => {
        if (
            !isFountainBlockNodeName(node.type.name)
            || !node.attrs?.blockType
            || !isCharacterBlock(node.attrs.blockType)
        ) {
            return;
        }

        const currentRefs = getCharacterRefByKey(node.attrs);

        /*
         * Determine which key in this block belongs to the character being renamed.
         * Prefer the linked (refs-based) match; fall back to canonical key in text.
         */
        const linkedEntry = Object.entries(currentRefs).find(([, id]) => id === characterId);
        const matchingKey = linkedEntry?.[0] ?? null;

        const text = getNodeTextContent(node);
        const tokens = splitCharacterTokens(text);

        let resolvedMatchingKey: string | null = matchingKey;

        if (!resolvedMatchingKey && canonicalOldKey) {
            // Unlinked block: check if the canonical old key appears in text
            const hasKey = tokens.some(token => normalizeCharacterKey(token.value) === canonicalOldKey);

            if (hasKey) {
                resolvedMatchingKey = canonicalOldKey;
            }
        }

        if (!resolvedMatchingKey) {
            return;
        }

        const currentMatchingKey = resolvedMatchingKey;

        // Find the token whose normalized key matches
        const matchingToken = tokens.find(token => normalizeCharacterKey(token.value) === currentMatchingKey);

        if (!matchingToken) {
            return;
        }

        // Transform the new name for the block type (e.g., uppercase for character cue)
        const formattedName = getCharacterNameForBlockType
            ? getCharacterNameForBlockType(normalizedNewName, node.attrs.blockType)
            : normalizedNewName;

        // Preserve trailing parenthetical suffix (e.g., "JIMMY (V.O.)" → "TOM (V.O.)")
        const {suffix} = splitTrailingParenthetical(matchingToken.value);
        const finalTokenValue = suffix.length > 0
            ? `${formattedName} ${suffix}`
            : formattedName;

        // Build new text by replacing just the matching token's value portion
        const newText = text.slice(0, matchingToken.valueStart) + finalTokenValue + text.slice(matchingToken.valueEnd);

        // Update refs: remove old key, add new key → same characterId
        const newKey = normalizeCharacterKey(formattedName);
        const nextRefs: CharacterRefByKey = {};

        for (const [key, id] of Object.entries(currentRefs)) {
            if (key === currentMatchingKey) {
                // Remove the old key entry (it will be replaced with newKey below)
                continue;
            }

            nextRefs[key] = id;
        }

        if (newKey) {
            nextRefs[newKey] = characterId;
        }

        changes.push({
            pos,
            contentSize: node.content.size,
            newText,
            newRefs: nextRefs,
            nodeAttrs: node.attrs as Record<string, unknown>,
        });
    });

    if (changes.length === 0) {
        return false;
    }

    // Apply changes in reverse document order to avoid position shifts
    let tr: Transaction = state.tr;

    for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];

        // setNodeMarkup first (doesn't change positions)
        tr = tr.setNodeMarkup(change.pos, undefined, {
            ...change.nodeAttrs,
            characterRefs: change.newRefs,
        });

        // Then replace text content
        const from = change.pos + 1;
        const to = change.pos + 1 + change.contentSize;

        tr = tr.replaceWith(from, to, state.schema.text(change.newText));
    }

    editor.view.dispatch(tr);

    return true;
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

    editor.state.doc.descendants((node, pos) => {
        if (targetPos !== null) {
            return false; // Stop iterating
        }

        if (
            !isFountainBlockNodeName(node.type.name)
            || !node.attrs?.blockType
            || !isCharacterBlock(node.attrs.blockType)
        ) {
            return;
        }

        const text = getNodeTextContent(node);
        const keys = extractCharacterKeys(text);

        if (keys.includes(normalizedKey)) {
            targetPos = pos;

            return false; // Stop iterating
        }
    });

    if (targetPos === null) {
        return false;
    }

    // Focus the block at the start of its content
    const focusPos = (targetPos as number) + 1;

    editor.commands.focus(focusPos);
    editor.commands.scrollIntoView();

    return true;
};

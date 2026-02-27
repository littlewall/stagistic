import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/script-core';
import type {Transaction} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {
    type CharacterRefByKey,
    readNormalizedRefsFromAttrs,
    visitCharacterBlocks,
    writeRefsToNodeAttrs,
} from '../../characters/characterRefUtils';

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

const getNodeTextContent = (value: {textContent?: string | null}) => {
    return value.textContent ?? '';
};

export const findCanonicalKeyForCharacterId = (
    editor: Editor,
    characterId: string,
    fallbackOldName?: string,
): string | null => {
    const {state} = editor;
    let canonicalOldKey: string | null = null;

    visitCharacterBlocks({
        doc: state.doc,
        onCharacterBlock: node => {
            if (canonicalOldKey !== null) {
                return false;
            }

            const refs = readNormalizedRefsFromAttrs(node.attrs as Record<string, unknown>);
            const entry = Object.entries(refs).find(([, id]) => id === characterId);

            if (entry) {
                canonicalOldKey = entry[0];
            }

            return false;
        },
    });

    if (canonicalOldKey === null && fallbackOldName) {
        const normalizedFallbackKey = normalizeCharacterKey(fallbackOldName);

        if (normalizedFallbackKey) {
            canonicalOldKey = normalizedFallbackKey;
        }
    }

    return canonicalOldKey;
};

interface PendingChange {
    pos: number,
    contentSize: number,
    newText: string,
    newRefs: CharacterRefByKey,
    nodeAttrs: Record<string, unknown>,
}

interface RunCharacterRefRenameCommandArgs {
    editor: Editor,
    characterId: string,
    newName: string,
    getCharacterNameForBlockType?: (name: string, blockType: unknown) => string,
    fallbackOldName?: string,
}

export const runCharacterRefRenameCommand = ({
    editor,
    characterId,
    newName,
    getCharacterNameForBlockType,
    fallbackOldName,
}: RunCharacterRefRenameCommandArgs): boolean => {
    const normalizedNewName = newName.trim();

    if (!characterId || !normalizedNewName) {
        return false;
    }

    const {state} = editor;
    const canonicalOldKey = findCanonicalKeyForCharacterId(editor, characterId, fallbackOldName);
    const changes: PendingChange[] = [];

    visitCharacterBlocks({
        doc: state.doc,
        onCharacterBlock: (node, pos) => {
            const currentRefs = readNormalizedRefsFromAttrs(node.attrs as Record<string, unknown>);
            const text = getNodeTextContent(node);
            const tokens = splitCharacterTokens(text);
            const hasLinkedToken = tokens.some(token => {
                const key = normalizeCharacterKey(token.value);

                return Boolean(key && currentRefs[key] === characterId);
            });
            const shouldUseCanonicalFallback = !hasLinkedToken && Boolean(canonicalOldKey);

            if (!hasLinkedToken && !shouldUseCanonicalFallback) {
                return false;
            }

            const formattedName = getCharacterNameForBlockType
                ? getCharacterNameForBlockType(normalizedNewName, node.attrs.blockType)
                : normalizedNewName;
            const targetKey = normalizeCharacterKey(formattedName);
            let didRename = false;
            const renamedTokens = tokens.map(token => {
                const sourceValue = token.value.trim();
                const sourceKey = normalizeCharacterKey(sourceValue);
                const tokenCharacterId = sourceKey ? currentRefs[sourceKey] : undefined;
                const shouldRename = hasLinkedToken
                    ? tokenCharacterId === characterId
                    : sourceKey === canonicalOldKey;

                if (!shouldRename) {
                    return {
                        value: sourceValue,
                        key: sourceKey,
                    };
                }

                const {suffix} = splitTrailingParenthetical(sourceValue);
                const nextValue = suffix.length > 0
                    ? `${formattedName} ${suffix}`
                    : formattedName;

                if (nextValue === sourceValue) {
                    return {
                        value: sourceValue,
                        key: sourceKey,
                    };
                }

                didRename = true;

                return {
                    value: nextValue,
                    key: normalizeCharacterKey(nextValue),
                };
            });

            if (!didRename) {
                return false;
            }

            const dedupedValues: string[] = [];
            const dedupedKeys: string[] = [];
            const seen = new Set<string>();

            renamedTokens.forEach(token => {
                if (!token.value || !token.key || seen.has(token.key)) {
                    return;
                }

                seen.add(token.key);
                dedupedValues.push(token.value);
                dedupedKeys.push(token.key);
            });

            if (dedupedValues.length === 0) {
                return false;
            }

            const newText = dedupedValues.join('+');
            const presentKeys = new Set(dedupedKeys);
            const nextRefs: CharacterRefByKey = {};

            Object.entries(currentRefs).forEach(([key, id]) => {
                if (!presentKeys.has(key)) {
                    return;
                }

                if (id === characterId && key !== targetKey) {
                    return;
                }

                nextRefs[key] = id;
            });

            if (targetKey) {
                nextRefs[targetKey] = characterId;
            }

            changes.push({
                pos,
                contentSize: node.content.size,
                newText,
                newRefs: nextRefs,
                nodeAttrs: node.attrs as Record<string, unknown>,
            });

            return false;
        },
    });

    if (changes.length === 0) {
        return false;
    }

    let tr: Transaction = state.tr;

    for (let index = changes.length - 1; index >= 0; index -= 1) {
        const change = changes[index];

        tr = tr.setNodeMarkup(
            change.pos,
            undefined,
            writeRefsToNodeAttrs(change.nodeAttrs, change.newRefs),
        );

        const from = change.pos + 1;
        const to = change.pos + 1 + change.contentSize;

        tr = tr.replaceWith(from, to, state.schema.text(change.newText));
    }

    editor.view.dispatch(tr);

    return true;
};

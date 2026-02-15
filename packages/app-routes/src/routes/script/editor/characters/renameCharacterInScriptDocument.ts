import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/editor-core';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainJSONContent,
    type ScriptDocument,
} from '@stagistic/shared';

import {
    type CharacterRefByKey,
    getCharacterRefByKey,
    getNodeTextContent,
    isCharacterBlockType,
    normalizeCharacterDisplayName,
    type ScriptDocumentChangeResult,
    unchangedScriptDocument,
    withCharacterRefByKey,
} from './documentHelpers';

const splitCharacterBaseAndSuffix = (value: string) => {
    const trimmed = value.trim();
    const suffixMatch = trimmed.match(/\s*(\([^()]*\)\s*)+$/);

    if (!suffixMatch) {
        return {
            base: trimmed,
            suffix: '',
        };
    }

    const suffix = suffixMatch[0].trim();
    const base = trimmed.slice(0, trimmed.length - suffixMatch[0].length).trim();

    return {
        base,
        suffix,
    };
};

const renameCharacterLine = (
    line: string,
    fromCharacterKey: string,
    toCharacterName: string,
    characterRefByKey: CharacterRefByKey,
    characterId?: string,
) => {
    const tokens = splitCharacterTokens(line);
    let didRename = false;
    const normalizedSourceKey = normalizeCharacterKey(fromCharacterKey);
    const normalizedTargetName = normalizeCharacterDisplayName(toCharacterName);
    const normalizedTargetKey = normalizeCharacterKey(normalizedTargetName);

    const renamedTokens = tokens.map(token => {
        const sourceValue = token.value.trim();
        const sourceKey = normalizeCharacterKey(sourceValue);
        const tokenCharacterId = characterRefByKey[sourceKey];
        const shouldRename = characterId
            ? tokenCharacterId === characterId
                || (!tokenCharacterId && sourceKey === normalizedSourceKey)
            : sourceKey === normalizedSourceKey;

        if (!shouldRename) {
            return {
                value: sourceValue,
                key: sourceKey,
            };
        }

        const {
            suffix,
        } = splitCharacterBaseAndSuffix(sourceValue);
        const nextValue = suffix.length > 0
            ? `${normalizedTargetName} ${suffix}`
            : normalizedTargetName;

        didRename = true;

        return {
            value: nextValue,
            key: normalizeCharacterKey(nextValue),
        };
    });

    if (!didRename) {
        return {
            line,
            changed: false,
            characterRefByKey,
        };
    }

    const dedupedValues: string[] = [];
    const dedupedKeys: string[] = [];
    const seen = new Set<string>();

    renamedTokens.forEach(token => {
        if (token.value.length === 0 || token.key.length === 0 || seen.has(token.key)) {
            return;
        }

        seen.add(token.key);
        dedupedValues.push(token.value);
        dedupedKeys.push(token.key);
    });

    const presentKeys = new Set(dedupedKeys);
    const nextCharacterRefByKey: CharacterRefByKey = {};

    Object.entries(characterRefByKey).forEach(([key, id]) => {
        if (!presentKeys.has(key)) {
            return;
        }

        if (characterId && id === characterId && key === normalizedSourceKey && key !== normalizedTargetKey) {
            return;
        }

        nextCharacterRefByKey[key] = id;
    });

    if (normalizedTargetKey.length > 0) {
        if (characterId) {
            nextCharacterRefByKey[normalizedTargetKey] = characterId;
        } else {
            const sourceCharacterId = characterRefByKey[normalizedSourceKey];

            if (sourceCharacterId) {
                nextCharacterRefByKey[normalizedTargetKey] = sourceCharacterId;
            }
        }
    }

    return {
        line: dedupedValues.join('+'),
        changed: true,
        characterRefByKey: nextCharacterRefByKey,
    };
};

export const renameCharacterInScriptDocument = (
    value: ScriptDocument,
    fromCharacterKey: string,
    toCharacterName: string,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    options?: {characterId?: string},
): ScriptDocumentChangeResult => {
    const replaceNodes = (nodes: FountainJSONContent[] | undefined): {
        nodes: FountainJSONContent[] | undefined,
        changed: boolean,
    } => {
        if (!Array.isArray(nodes)) {
            return {
                nodes,
                changed: false,
            };
        }

        let didChange = false;
        const nextNodes = nodes.map(node => {
            if (!node || typeof node !== 'object') {
                return node;
            }

            if (node.type === FOUNTAIN_BLOCK_NODE_NAME && isCharacterBlockType(node.attrs?.blockType)) {
                const sourceLine = getNodeTextContent(node);
                const replacementName = getCharacterNameForBlockType(toCharacterName, node.attrs?.blockType);
                const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);
                const {
                    line: renamedLine,
                    changed: didRenameLine,
                    characterRefByKey: nextCharacterRefByKey,
                } = renameCharacterLine(
                    sourceLine,
                    fromCharacterKey,
                    replacementName,
                    sourceCharacterRefByKey,
                    options?.characterId,
                );

                if (!didRenameLine) {
                    return node;
                }

                didChange = true;

                return withCharacterRefByKey({
                    ...node,
                    content: renamedLine.length > 0
                        ? [{type: 'text', text: renamedLine}]
                        : [],
                }, nextCharacterRefByKey);
            }

            const {
                nodes: nextContent,
                changed: didChangeChildren,
            } = replaceNodes(node.content);

            if (!didChangeChildren) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: nextContent,
            };
        });

        return {
            nodes: didChange ? nextNodes : nodes,
            changed: didChange,
        };
    };

    const {
        nodes: nextContent,
        changed,
    } = replaceNodes(value.content);

    if (!changed || !nextContent) {
        return unchangedScriptDocument(value);
    }

    return {
        value: {
            ...value,
            content: nextContent,
        },
        changed: true,
    };
};

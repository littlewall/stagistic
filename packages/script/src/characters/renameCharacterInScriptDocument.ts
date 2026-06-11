import {splitTrailingParentheticalSuffix} from '@stagistic/shared';

import {
    getScriptBlockLegacyType,
    type ScriptDocument,
} from '../document';
import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '../fountain';
import {
    type CharacterRefByKey,
    getCharacterRefByKey,
    getNodeTextContent,
    mapCharacterBlockNodes,
    normalizeCharacterDisplayName,
    type ScriptDocumentChangeResult,
    unchangedScriptDocument,
    withCharacterRefByKey,
} from './documentHelpers';

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
        } = splitTrailingParentheticalSuffix(sourceValue);
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

    if (normalizedTargetKey.length > 0 && characterId) {
        nextCharacterRefByKey[normalizedTargetKey] = characterId;
    }

    if (normalizedTargetKey.length > 0 && !characterId) {
        const sourceCharacterId = characterRefByKey[normalizedSourceKey];

        if (sourceCharacterId) {
            nextCharacterRefByKey[normalizedTargetKey] = sourceCharacterId;
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
    const {nodes: nextContent, changed} = mapCharacterBlockNodes(value.content, node => {
        const blockType = getScriptBlockLegacyType(node);
        const sourceLine = getNodeTextContent(node);
        const replacementName = getCharacterNameForBlockType(toCharacterName, blockType);
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

        return withCharacterRefByKey(
            {
                ...node,
                content: renamedLine.length > 0 ? [{type: 'text', text: renamedLine}] : [],
            },
            nextCharacterRefByKey,
        );
    });

    if (!changed || !nextContent) {
        return unchangedScriptDocument(value);
    }

    return {
        value: {...value, content: nextContent},
        changed: true,
    };
};

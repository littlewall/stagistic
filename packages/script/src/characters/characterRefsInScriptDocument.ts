import {
    isScriptBlockNode,
    type ScriptDocument,
    type ScriptNode,
} from '../document';
import {
    extractCharacterKeys,
    normalizeCharacterKey,
} from '../syntax';
import {mapCharacterTagMarks} from './characterTagMarks';
import {
    type CharacterRefByKey,
    getCharacterRefByKey,
    getNodeTextContent,
    mapCharacterBlockNodes,
    type ScriptDocumentChangeResult,
    unchangedScriptDocument,
    withCharacterRefByKey,
} from './documentHelpers';

const mapAllNodesTagMarks = (
    value: ScriptDocument,
    patch: Parameters<typeof mapCharacterTagMarks>[1],
): ScriptDocumentChangeResult => {
    let changed = false;

    const walk = (nodes: ScriptNode[]): ScriptNode[] => nodes.map(node => {
        let next = node;

        if (isScriptBlockNode(node)) {
            const mapped = mapCharacterTagMarks(node, patch);

            if (mapped !== node) {
                changed = true;
                next = mapped;
            }
        }

        if (Array.isArray(next.content) && next.content.some(isScriptBlockNode)) {
            const childContent = walk(next.content);

            if (childContent !== next.content) {
                next = {...next, content: childContent};
            }
        }

        return next;
    });

    const content = walk(value.content);

    return changed
        ? {value: {...value, content}, changed: true}
        : unchangedScriptDocument(value);
};

const applyMapResult = (
    value: ScriptDocument,
    nodes: ReturnType<typeof mapCharacterBlockNodes>,
): ScriptDocumentChangeResult => {
    if (!nodes.changed || !nodes.nodes) {
        return unchangedScriptDocument(value);
    }

    return {
        value: {...value, content: nodes.nodes},
        changed: true,
    };
};

export const linkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterKey: string,
    characterId: string,
): ScriptDocumentChangeResult => {
    const normalizedCharacterKey = normalizeCharacterKey(characterKey);

    if (normalizedCharacterKey.length === 0 || characterId.length === 0) {
        return unchangedScriptDocument(value);
    }

    const cueResult = applyMapResult(
        value,
        mapCharacterBlockNodes(value.content, node => {
            const text = getNodeTextContent(node);
            const keys = extractCharacterKeys(text);

            if (!keys.includes(normalizedCharacterKey)) {
                return node;
            }

            const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);

            if (sourceCharacterRefByKey[normalizedCharacterKey] === characterId) {
                return node;
            }

            return withCharacterRefByKey(node, {
                ...sourceCharacterRefByKey,
                [normalizedCharacterKey]: characterId,
            });
        }),
    );

    const tagResult = mapAllNodesTagMarks(cueResult.value, tag => tag.key === normalizedCharacterKey && tag.characterId !== characterId
            ? {characterId}
            : null);

    return {value: tagResult.value, changed: cueResult.changed || tagResult.changed};
};

export const unlinkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterId: string,
): ScriptDocumentChangeResult => {
    if (characterId.length === 0) {
        return unchangedScriptDocument(value);
    }

    const cueResult = applyMapResult(
        value,
        mapCharacterBlockNodes(value.content, node => {
            const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);
            const nextCharacterRefByKey = Object.entries(sourceCharacterRefByKey).reduce<CharacterRefByKey>(
                (acc, [key, id]) => {
                    if (id !== characterId) {
                        acc[key] = id;
                    }

                    return acc;
                },
                {},
            );

            if (Object.keys(nextCharacterRefByKey).length === Object.keys(sourceCharacterRefByKey).length) {
                return node;
            }

            return withCharacterRefByKey(node, nextCharacterRefByKey);
        }),
    );

    const tagResult = mapAllNodesTagMarks(cueResult.value, tag => tag.characterId === characterId ? {characterId: null} : null);

    return {value: tagResult.value, changed: cueResult.changed || tagResult.changed};
};

export const replaceCharacterRefIdInScriptDocument = (
    value: ScriptDocument,
    sourceCharacterId: string,
    targetCharacterId: string,
): ScriptDocumentChangeResult => {
    if (
        sourceCharacterId.length === 0
        || targetCharacterId.length === 0
        || sourceCharacterId === targetCharacterId
    ) {
        return unchangedScriptDocument(value);
    }

    const cueResult = applyMapResult(
        value,
        mapCharacterBlockNodes(value.content, node => {
            const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);
            let changedCharacterRef = false;
            const nextCharacterRefByKey = Object.entries(sourceCharacterRefByKey).reduce<CharacterRefByKey>(
                (acc, [key, id]) => {
                    if (id === sourceCharacterId) {
                        acc[key] = targetCharacterId;
                        changedCharacterRef = true;

                        return acc;
                    }

                    acc[key] = id;

                    return acc;
                },
                {},
            );

            if (!changedCharacterRef) {
                return node;
            }

            return withCharacterRefByKey(node, nextCharacterRefByKey);
        }),
    );

    const tagResult = mapAllNodesTagMarks(cueResult.value, tag => tag.characterId === sourceCharacterId ? {characterId: targetCharacterId} : null);

    return {value: tagResult.value, changed: cueResult.changed || tagResult.changed};
};

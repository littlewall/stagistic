import {type ScriptDocument} from '../document';
import {
    extractCharacterKeys,
    normalizeCharacterKey,
} from '../syntax';
import {
    type CharacterRefByKey,
    getCharacterRefByKey,
    getNodeTextContent,
    mapCharacterBlockNodes,
    type ScriptDocumentChangeResult,
    unchangedScriptDocument,
    withCharacterRefByKey,
} from './documentHelpers';

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

    return applyMapResult(
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
};

export const unlinkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterId: string,
): ScriptDocumentChangeResult => {
    if (characterId.length === 0) {
        return unchangedScriptDocument(value);
    }

    return applyMapResult(
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

    return applyMapResult(
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
};

import {
    type FountainJSONContent,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptDocument,
} from '../document';
import {
    extractCharacterKeys,
    normalizeCharacterKey,
} from '../fountain';
import {
    type CharacterRefByKey,
    getCharacterRefByKey,
    getNodeTextContent,
    isCharacterBlockType,
    type ScriptDocumentChangeResult,
    unchangedScriptDocument,
    withCharacterRefByKey,
} from './documentHelpers';

export const linkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterKey: string,
    characterId: string,
): ScriptDocumentChangeResult => {
    const normalizedCharacterKey = normalizeCharacterKey(characterKey);

    if (normalizedCharacterKey.length === 0 || characterId.length === 0) {
        return unchangedScriptDocument(value);
    }

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

            if (isScriptBlockNode(node) && isCharacterBlockType(getScriptBlockLegacyType(node))) {
                const text = getNodeTextContent(node);
                const keys = extractCharacterKeys(text);

                if (!keys.includes(normalizedCharacterKey)) {
                    return node;
                }

                const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);

                if (sourceCharacterRefByKey[normalizedCharacterKey] === characterId) {
                    return node;
                }

                didChange = true;

                return withCharacterRefByKey(node, {
                    ...sourceCharacterRefByKey,
                    [normalizedCharacterKey]: characterId,
                });
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

export const unlinkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterId: string,
): ScriptDocumentChangeResult => {
    if (characterId.length === 0) {
        return unchangedScriptDocument(value);
    }

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

            if (isScriptBlockNode(node) && isCharacterBlockType(getScriptBlockLegacyType(node))) {
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

                didChange = true;

                return withCharacterRefByKey(node, nextCharacterRefByKey);
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

            if (isScriptBlockNode(node) && isCharacterBlockType(getScriptBlockLegacyType(node))) {
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

                didChange = true;

                return withCharacterRefByKey(node, nextCharacterRefByKey);
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

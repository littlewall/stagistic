import {
    collapseWhitespace,
    isObjectRecord,
} from '@stagistic/shared';

import {
    type FountainJSONContent,
    getScriptBlockLegacyType,
    isScriptBlockNode,
    type ScriptDocument,
} from '../document';
import {
    ELEMENT_CHARACTER,
    normalizeCharacterKey,
} from '../fountain';

export type CharacterRefByKey = Record<string, string>;

export type ScriptDocumentChangeResult = {
    value: ScriptDocument,
    changed: boolean,
};

export const isCharacterBlockType = (value: unknown) => {
    return value === ELEMENT_CHARACTER;
};

export const getNodeTextContent = (node: FountainJSONContent): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(getNodeTextContent).join('');
};

export const normalizeCharacterDisplayName = (value: string) => collapseWhitespace(value);

export const getCharacterRefByKey = (attrs: Record<string, unknown> | undefined): CharacterRefByKey => {
    if (!attrs || !isObjectRecord(attrs.characterRefs)) {
        return {};
    }

    const characterRefs: CharacterRefByKey = {};

    Object.entries(attrs.characterRefs).forEach(([rawKey, rawCharacterId]) => {
        if (typeof rawCharacterId !== 'string' || rawCharacterId.length === 0) {
            return;
        }

        const key = normalizeCharacterKey(rawKey);

        if (key.length === 0) {
            return;
        }

        characterRefs[key] = rawCharacterId;
    });

    return characterRefs;
};

export const withCharacterRefByKey = (
    node: FountainJSONContent,
    characterRefByKey: CharacterRefByKey,
): FountainJSONContent => {
    const attrs = isObjectRecord(node.attrs) ? node.attrs : {};
    const nextAttrs = {
        ...attrs,
    };

    if (Object.keys(characterRefByKey).length === 0) {
        delete nextAttrs.characterRefs;

        return {
            ...node,
            attrs: nextAttrs,
        };
    }

    nextAttrs.characterRefs = characterRefByKey;

    return {
        ...node,
        attrs: nextAttrs,
    };
};

export const unchangedScriptDocument = (value: ScriptDocument): ScriptDocumentChangeResult => ({
    value,
    changed: false,
});

type MapNodesResult = {
    nodes: FountainJSONContent[] | undefined,
    changed: boolean,
};

export const mapCharacterBlockNodes = (
    nodes: FountainJSONContent[] | undefined,
    visitor: (node: FountainJSONContent) => FountainJSONContent,
): MapNodesResult => {
    if (!Array.isArray(nodes)) {
        return {nodes, changed: false};
    }

    let didChange = false;
    const nextNodes = nodes.map(node => {
        if (!node || typeof node !== 'object') {
            return node;
        }

        if (isScriptBlockNode(node) && isCharacterBlockType(getScriptBlockLegacyType(node))) {
            const next = visitor(node);

            if (next !== node) {
                didChange = true;
            }

            return next;
        }

        const {nodes: nextContent, changed: didChangeChildren} = mapCharacterBlockNodes(node.content, visitor);

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

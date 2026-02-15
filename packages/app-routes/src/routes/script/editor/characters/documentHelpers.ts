import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    normalizeCharacterKey,
} from '@stagistic/editor-core';
import {
    type FountainJSONContent,
    type ScriptDocument,
} from '@stagistic/shared';

export type CharacterRefByKey = Record<string, string>;

export type ScriptDocumentChangeResult = {
    value: ScriptDocument,
    changed: boolean,
};

export const isCharacterBlockType = (value: unknown) => {
    return value === ELEMENT_CHARACTER || value === ELEMENT_DUAL_DIALOGUE_CHARACTER;
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

export const normalizeCharacterDisplayName = (value: string) => value
    .replace(/\s+/g, ' ')
    .trim();

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

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
    } else {
        nextAttrs.characterRefs = characterRefByKey;
    }

    return {
        ...node,
        attrs: nextAttrs,
    };
};

export const unchangedScriptDocument = (value: ScriptDocument): ScriptDocumentChangeResult => ({
    value,
    changed: false,
});

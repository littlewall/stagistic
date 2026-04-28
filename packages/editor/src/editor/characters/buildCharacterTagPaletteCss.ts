import {normalizeCharacterKey} from '@stagistic/script';

import {
    getCharacterTagIdClassName,
    getCharacterTagKeyClassName,
    normalizeCharacterColorHex,
} from '../characterColors';

interface BuildCharacterTagPaletteCssArgs {
    colorByCharacterId?: ReadonlyMap<string, string>,
    displayColorByKey?: ReadonlyMap<string, string>,
    scopeAttributeValue?: string | null,
}

const toScopedSelectorPrefix = (scopeAttributeValue?: string | null) => {
    if (!scopeAttributeValue) {
        return '';
    }

    const normalized = scopeAttributeValue
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '');

    if (!normalized) {
        return '';
    }

    return `[data-character-tag-scope="${normalized}"] `;
};

const toRule = (
    scopeSelectorPrefix: string,
    className: string,
    color: string,
) => {
    return `${scopeSelectorPrefix}.${className}{--character-tag-color:${color};}`;
};

export const buildCharacterTagPaletteCss = ({
    colorByCharacterId,
    displayColorByKey,
    scopeAttributeValue,
}: BuildCharacterTagPaletteCssArgs) => {
    const scopeSelectorPrefix = toScopedSelectorPrefix(scopeAttributeValue);
    const idRules = new Map<string, string>();
    const keyRules = new Map<string, string>();

    colorByCharacterId?.forEach((rawColor, rawCharacterId) => {
        const characterId = typeof rawCharacterId === 'string'
            ? rawCharacterId.trim()
            : '';

        if (!characterId) {
            return;
        }

        const color = normalizeCharacterColorHex(rawColor);

        if (!color) {
            return;
        }

        idRules.set(getCharacterTagIdClassName(characterId), color);
    });

    displayColorByKey?.forEach((rawColor, rawKey) => {
        const normalizedKey = normalizeCharacterKey(rawKey);

        if (!normalizedKey) {
            return;
        }

        const color = normalizeCharacterColorHex(rawColor);

        if (!color) {
            return;
        }

        keyRules.set(getCharacterTagKeyClassName(normalizedKey), color);
    });

    const cssLines: string[] = [];

    [...idRules.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .forEach(([className, color]) => {
            cssLines.push(toRule(scopeSelectorPrefix, className, color));
        });
    [...keyRules.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .forEach(([className, color]) => {
            cssLines.push(toRule(scopeSelectorPrefix, className, color));
        });

    return cssLines.join('\n');
};

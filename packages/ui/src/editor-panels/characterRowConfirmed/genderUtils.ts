import type {CharacterGenderOption} from '@stagistic/script-core';

import type {CharacterGenderIcon} from './types';

export const normalizeGenderLabel = (value: string) => value
    .replace(/\s+/gu, ' ')
    .trim();

export const normalizeGenderDisplayLabel = (value: string) => {
    const normalized = normalizeGenderLabel(value);

    if (normalized.length === 0) {
        return '';
    }

    return `${normalized.slice(0, 1).toLocaleLowerCase()}${normalized.slice(1)}`;
};

export const normalizeGenderKey = (value: string) => normalizeGenderLabel(value).toLocaleLowerCase();

export const getCharacterGenderIcon = (option: CharacterGenderOption | null): CharacterGenderIcon => {
    if (!option) {
        return 'neutral';
    }

    const normalizedKey = normalizeGenderKey(option.key);
    const normalizedLabel = normalizeGenderKey(option.label);

    if (normalizedKey === 'male' || normalizedLabel === 'male') {
        return 'male';
    }

    if (normalizedKey === 'female' || normalizedLabel === 'female') {
        return 'female';
    }

    return 'neutral';
};

export const getDeleteTooltipLabel = (
    characterKey: string,
    isDeletePending: boolean,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
) => {
    if (isDeletePending) {
        return `Deleting ${characterKey}`;
    }

    if (!onDeleteCharacter) {
        return 'Deletion unavailable';
    }

    return `Delete ${characterKey}`;
};

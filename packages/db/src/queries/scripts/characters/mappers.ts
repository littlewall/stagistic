import type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
} from './types';

type ScriptCharacterRow = {
    id: string,
    characterKey: string,
    colorHex: string | null,
    genderKey: string | null,
};

type ScriptCharacterGenderRow = {
    id: string,
    genderKey: string,
    genderLabel: string,
};

export const mapCharacterRow = (row: ScriptCharacterRow): ScriptCharacterRef => {
    return {
        id: row.id,
        key: row.characterKey,
        colorHex: row.colorHex,
        genderKey: row.genderKey,
    };
};

export const mapGenderRow = (row: ScriptCharacterGenderRow): ScriptCharacterGenderOption => {
    return {
        id: row.id,
        key: row.genderKey,
        label: row.genderLabel,
    };
};

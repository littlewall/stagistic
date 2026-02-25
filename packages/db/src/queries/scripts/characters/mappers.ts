import type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
} from '../../../types';

interface ScriptCharacterRow {
    id: string,
    characterKey: string,
    colorHex: string | null,
    genderKey: string | null,
    notes: string | null,
    backstory: string | null,
}

interface ScriptCharacterGenderRow {
    id: string,
    genderKey: string,
    genderLabel: string,
}

export const mapCharacterRow = (row: ScriptCharacterRow): ScriptCharacterRef => {
    return {
        id: row.id,
        key: row.characterKey,
        colorHex: row.colorHex,
        genderKey: row.genderKey,
        notes: row.notes,
        backstory: row.backstory,
    };
};

export const mapGenderRow = (row: ScriptCharacterGenderRow): ScriptCharacterGenderOption => {
    return {
        id: row.id,
        key: row.genderKey,
        label: row.genderLabel,
    };
};

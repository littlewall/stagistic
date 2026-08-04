import type {
    ScriptCharacterGenderOption,
    ScriptCharacterGroupRef,
    ScriptCharacterRef,
    ScriptSpeakingEntityRef,
} from '../../../types';

interface ScriptCharacterRow {
    id: string,
    kind: string,
    characterKey: string,
    colorHex: string | null,
    genderKey: string | null,
    notes: string | null,
    backstory: string | null,
    outline: string | null,
}

interface ScriptCharacterGenderRow {
    id: string,
    genderKey: string,
    genderLabel: string,
}

export const mapCharacterRow = (row: ScriptCharacterRow): ScriptCharacterRef => {
    return {
        id: row.id,
        kind: 'character',
        key: row.characterKey,
        colorHex: row.colorHex,
        genderKey: row.genderKey,
        notes: row.notes,
        backstory: row.backstory,
        outline: row.outline,
    };
};

export const mapSpeakingEntityRow = (
    row: ScriptCharacterRow,
    memberIds: string[],
): ScriptSpeakingEntityRef => {
    if (row.kind !== 'group') {
        return mapCharacterRow(row);
    }

    const group: ScriptCharacterGroupRef = {
        id: row.id,
        kind: 'group',
        key: row.characterKey,
        colorHex: row.colorHex,
        memberIds,
    };

    return group;
};

export const mapGenderRow = (row: ScriptCharacterGenderRow): ScriptCharacterGenderOption => {
    return {
        id: row.id,
        key: row.genderKey,
        label: row.genderLabel,
    };
};

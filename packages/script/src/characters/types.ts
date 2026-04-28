export interface ScriptCharacterRecord {
    id: string,
    key: string,
    colorHex?: string | null,
    genderKey?: string | null,
}

export interface CharacterGenderOption {
    id: string,
    key: string,
    label: string,
}

export interface ScriptCharacterStats {
    countsByKey: Map<string, number>,
    confirmedCountsById: Map<string, number>,
    unconfirmedCountsByKey: Map<string, number>,
}

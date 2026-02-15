export type CharacterCountItem = {
    id?: string,
    key: string,
    count: number,
    color: string,
    colorHex?: string | null,
    genderKey?: string | null,
    isConfirmed: boolean,
    isPending?: boolean,
    isConfirmPending?: boolean,
    isDeletePending?: boolean,
    isRenamePending?: boolean,
    isColorUpdatePending?: boolean,
    isGenderUpdatePending?: boolean,
};

export type ScriptCharacterRecord = {
    id: string,
    key: string,
    colorHex?: string | null,
    genderKey?: string | null,
};

export type CharacterGenderOption = {
    id: string,
    key: string,
    label: string,
};

export type ScriptCharacterStats = {
    countsByKey: Map<string, number>,
    confirmedCountsById: Map<string, number>,
    unconfirmedCountsByKey: Map<string, number>,
};

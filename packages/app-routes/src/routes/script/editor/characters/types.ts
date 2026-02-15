export type CharacterCountItem = {
    id?: string,
    key: string,
    count: number,
    color: string,
    isConfirmed: boolean,
    isPending?: boolean,
    isConfirmPending?: boolean,
    isDeletePending?: boolean,
    isRenamePending?: boolean,
};

export type ScriptCharacterRecord = {
    id: string,
    key: string,
};

export type ScriptCharacterStats = {
    countsByKey: Map<string, number>,
    confirmedCountsById: Map<string, number>,
    unconfirmedCountsByKey: Map<string, number>,
};

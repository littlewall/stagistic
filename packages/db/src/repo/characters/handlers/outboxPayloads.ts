export const buildCharacterConfirmPayload = (scriptId: string, characterKey: string, confirmedAt: number) => {
    return JSON.stringify({
        scriptId,
        characterKey,
        confirmedAt,
    });
};

export const buildCharacterDeletePayload = (
    scriptId: string,
    characterId: string,
    characterKey: string,
    deletedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        characterKey,
        deletedAt,
    });
};

export const buildCharacterRenamePayload = (
    scriptId: string,
    characterId: string,
    previousCharacterKey: string,
    nextCharacterKey: string,
    renamedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        previousCharacterKey,
        nextCharacterKey,
        renamedAt,
    });
};

export const buildCharacterColorPayload = (
    scriptId: string,
    characterId: string,
    colorHex: string | null,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        colorHex,
        updatedAt,
    });
};

export const buildCharacterGenderPayload = (
    scriptId: string,
    characterId: string,
    genderKey: string | null,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        genderKey,
        updatedAt,
    });
};

export const buildCharacterOutlinePayload = (
    scriptId: string,
    characterId: string,
    outline: string | null,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        outline,
        updatedAt,
    });
};

export const buildCharacterVoiceTypePayload = (
    scriptId: string,
    characterId: string,
    voiceType: string | null,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        voiceType,
        updatedAt,
    });
};

export const buildCharacterVocalRangePayload = (
    scriptId: string,
    characterId: string,
    vocalRangeLow: string | null,
    vocalRangeHigh: string | null,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        characterId,
        vocalRangeLow,
        vocalRangeHigh,
        updatedAt,
    });
};

export const buildCharacterGenderUpsertPayload = (
    scriptId: string,
    genderKey: string,
    genderLabel: string,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        genderKey,
        genderLabel,
        updatedAt,
    });
};

export const buildCharacterGroupCreatePayload = (
    scriptId: string,
    groupId: string,
    key: string,
    colorHex: string | null,
    createdAt: number,
) => {
    return JSON.stringify({
        scriptId,
        groupId,
        key,
        colorHex,
        createdAt,
    });
};

export const buildCharacterGroupRenamePayload = (
    scriptId: string,
    groupId: string,
    previousKey: string,
    nextKey: string,
    renamedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        groupId,
        previousKey,
        nextKey,
        renamedAt,
    });
};

export const buildCharacterGroupDeletePayload = (
    scriptId: string,
    groupId: string,
    key: string,
    deletedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        groupId,
        key,
        deletedAt,
    });
};

export const buildCharacterGroupColorPayload = (
    scriptId: string,
    groupId: string,
    colorHex: string | null,
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        groupId,
        colorHex,
        updatedAt,
    });
};

export const buildCharacterGroupMembersPayload = (
    scriptId: string,
    groupId: string,
    memberIds: string[],
    updatedAt: number,
) => {
    return JSON.stringify({
        scriptId,
        groupId,
        memberIds,
        updatedAt,
    });
};

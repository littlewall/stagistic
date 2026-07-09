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

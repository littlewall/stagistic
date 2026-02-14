const CHARACTER_COLOR_PALETTE = [
    '#E9C6A8',
    '#C9D8A2',
    '#A8D4C7',
    '#AFCDEA',
    '#C6B9E8',
    '#E2B9D6',
    '#F0D39B',
    '#C4D2C2',
] as const;

export const getCharacterColor = (characterKey: string) => {
    if (characterKey.length === 0) {
        return CHARACTER_COLOR_PALETTE[0];
    }

    let hash = 0;

    for (let index = 0; index < characterKey.length; index += 1) {
        hash = ((hash << 5) - hash + characterKey.charCodeAt(index)) | 0;
    }

    const colorIndex = Math.abs(hash) % CHARACTER_COLOR_PALETTE.length;

    return CHARACTER_COLOR_PALETTE[colorIndex] ?? CHARACTER_COLOR_PALETTE[0];
};

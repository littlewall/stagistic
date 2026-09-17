export const VOICE_TYPE_SUGGESTIONS = [
    'soprano',
    'mezzo-soprano',
    'alto',
    'contralto',
    'countertenor',
    'tenor',
    'light baritone',
    'baritone',
    'bass-baritone',
    'bass',
] as const;

type VoiceType = (typeof VOICE_TYPE_SUGGESTIONS)[number];

interface VocalRangeDefaults {
    low: string,
    high: string,
}

const VOICE_TYPE_DEFAULT_RANGES = {
    soprano: {low: 'C4', high: 'C6'},
    'mezzo-soprano': {low: 'C4', high: 'A5'},
    alto: {low: 'F3', high: 'D5'},
    contralto: {low: 'E3', high: 'C5'},
    countertenor: {low: 'G3', high: 'D5'},
    tenor: {low: 'C3', high: 'C5'},
    'light baritone': {low: 'C3', high: 'A4'},
    baritone: {low: 'C3', high: 'G4'},
    'bass-baritone': {low: 'C3', high: 'F4'},
    bass: {low: 'C3', high: 'E4'},
} as const satisfies Record<VoiceType, VocalRangeDefaults>;

export const getDefaultVocalRangeForVoiceType = (
    value: string | null,
): VocalRangeDefaults | null => {
    const normalized = value?.trim().toLowerCase();

    if (!normalized || !Object.hasOwn(VOICE_TYPE_DEFAULT_RANGES, normalized)) {
        return null;
    }

    return VOICE_TYPE_DEFAULT_RANGES[normalized as VoiceType];
};

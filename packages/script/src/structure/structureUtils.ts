import {DEFAULT_EDITOR_SETTINGS, type StructureSettings} from '../settings';

const ACT_NAME_WORDS = [
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
] as const;

export const normalizeActName = (value: string) => {
    return value.trim().toLocaleUpperCase();
};

export const getDefaultActName = (index: number) => {
    return ACT_NAME_WORDS[index - 1] ?? `ACT ${index}`;
};

export const resolveStructureSettings = (settings?: Partial<StructureSettings>): StructureSettings => ({
    actPrefix: settings?.actPrefix ?? DEFAULT_EDITOR_SETTINGS.structure.actPrefix,
    actDisplay: {
        linesBefore: settings?.actDisplay?.linesBefore ?? DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesBefore,
        linesAfter: settings?.actDisplay?.linesAfter ?? DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesAfter,
    },
});

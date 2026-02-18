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
    musicPrefixes: {
        song: {
            start: settings?.musicPrefixes?.song?.start
                ?? DEFAULT_EDITOR_SETTINGS.structure.musicPrefixes.song.start,
            end: settings?.musicPrefixes?.song?.end
                ?? DEFAULT_EDITOR_SETTINGS.structure.musicPrefixes.song.end,
        },
        reprise: {
            start: settings?.musicPrefixes?.reprise?.start
                ?? DEFAULT_EDITOR_SETTINGS.structure.musicPrefixes.reprise.start,
            end: settings?.musicPrefixes?.reprise?.end
                ?? DEFAULT_EDITOR_SETTINGS.structure.musicPrefixes.reprise.end,
        },
        underscore: {
            start: settings?.musicPrefixes?.underscore?.start
                ?? DEFAULT_EDITOR_SETTINGS.structure.musicPrefixes.underscore.start,
            end: settings?.musicPrefixes?.underscore?.end
                ?? DEFAULT_EDITOR_SETTINGS.structure.musicPrefixes.underscore.end,
        },
    },
});

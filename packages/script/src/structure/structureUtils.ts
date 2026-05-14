import {DEFAULT_EDITOR_SETTINGS, type StructureSettings} from '../settings';

export const normalizeActName = (value: string) => {
    return value.trim().toLocaleUpperCase();
};

export const getDefaultActName = (index: number) => {
    return `ACT ${index}`;
};

export const resolveStructureSettings = (settings?: Partial<StructureSettings>): StructureSettings => ({
    actDisplay: {
        linesBefore: settings?.actDisplay?.linesBefore ?? DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesBefore,
        linesAfter: settings?.actDisplay?.linesAfter ?? DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesAfter,
    },
});

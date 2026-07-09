import {
    DEFAULT_EDITOR_SETTINGS, type StructureSettings, type StructureSettingsPatch,
} from '../settings';

export const normalizeActName = (value: string) => {
    return value.trim();
};

export const getDefaultActName = (index: number) => {
    return `ACT ${index}`;
};

export const resolveStructureSettings = (settings?: StructureSettingsPatch): StructureSettings => ({
    actDisplay: {
        linesBefore: settings?.actDisplay?.linesBefore ?? DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesBefore,
        linesAfter: settings?.actDisplay?.linesAfter ?? DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesAfter,
    },
});

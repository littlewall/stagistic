import {isScriptBlockNodeType} from '../syntax';

export const normalizeEditorSettingsBlockType = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    return isScriptBlockNodeType(value) ? value : null;
};

import {isScriptBlockNodeType} from '../syntax';

export const normalizeEditorSettingsBlockType = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    if (value === 'fountain_lyric' || value === 'fountain_lyrics') {
        return 'lyrics';
    }

    return isScriptBlockNodeType(value) ? value : null;
};

export const BLOCK_SHORTCUT_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const;

export type BlockShortcut = (typeof BLOCK_SHORTCUT_OPTIONS)[number];

export const isBlockShortcut = (value: unknown): value is BlockShortcut => {
    return typeof value === 'string' && BLOCK_SHORTCUT_OPTIONS.includes(value as BlockShortcut);
};

export const BLOCK_TEXT_ALIGN_OPTIONS = ['left', 'center', 'right'] as const;

export type BlockTextAlign = (typeof BLOCK_TEXT_ALIGN_OPTIONS)[number];

export const BLOCK_CASING_OPTIONS = ['normal', 'uppercase', 'lowercase'] as const;

export type BlockCasing = (typeof BLOCK_CASING_OPTIONS)[number];

export const SCENE_NUMBER_FORMAT_OPTIONS = ['none', 'dot', 'paren'] as const;

export type SceneNumberFormat = (typeof SCENE_NUMBER_FORMAT_OPTIONS)[number];

export const DEFAULT_SCENE_NUMBER_FORMAT: SceneNumberFormat = 'dot';

export const isSceneNumberFormat = (value: unknown): value is SceneNumberFormat => {
    return typeof value === 'string' && SCENE_NUMBER_FORMAT_OPTIONS.includes(value as SceneNumberFormat);
};

/**
 * Renders a scene's computed number with the block's chosen suffix. Shared by
 * the editor's scene-numbering decoration and the export transcript so both
 * surfaces always agree; `none` yields an empty label so callers can skip it.
 */
export const formatSceneNumber = (sceneNumber: number, format: SceneNumberFormat = DEFAULT_SCENE_NUMBER_FORMAT): string => {
    if (format === 'none') {
        return '';
    }

    return format === 'paren' ? `${sceneNumber})` : `${sceneNumber}.`;
};

export const CHARACTER_COLOR_SATURATION_MIN = 30;
export const CHARACTER_COLOR_SATURATION_MAX = 60;
export const CHARACTER_COLOR_SATURATION_DEFAULT = CHARACTER_COLOR_SATURATION_MAX;
export const CHARACTER_COLOR_SATURATION_OPTIONS = [30, 40, 50, 60] as const;

export const clampCharacterColorSaturation = (value: number | null | undefined): number => {
    if (!Number.isFinite(value)) {
        return CHARACTER_COLOR_SATURATION_DEFAULT;
    }

    return Math.max(CHARACTER_COLOR_SATURATION_MIN, Math.min(CHARACTER_COLOR_SATURATION_MAX, Math.round(value as number)));
};

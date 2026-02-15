export const BLOCK_SHORTCUT_OPTIONS = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '0',
] as const;

export type BlockShortcut = (typeof BLOCK_SHORTCUT_OPTIONS)[number];

export const isBlockShortcut = (value: unknown): value is BlockShortcut => {
    return typeof value === 'string'
        && BLOCK_SHORTCUT_OPTIONS.includes(value as BlockShortcut);
};

export const BLOCK_TEXT_ALIGN_OPTIONS = [
    'left',
    'center',
    'right',
] as const;

export type BlockTextAlign = (typeof BLOCK_TEXT_ALIGN_OPTIONS)[number];

export const BLOCK_CASING_OPTIONS = ['normal', 'uppercase'] as const;

export type BlockCasing = (typeof BLOCK_CASING_OPTIONS)[number];

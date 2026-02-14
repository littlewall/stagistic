import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/editor-core';

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

type BlockSpacingSettings = {
    spacingBeforeEm?: number,
    indentLeftChars?: number,
    indentRightChars?: number,
    indentLeftPx?: number,
    indentRightPx?: number,
    fontSizePx?: number,
    lineHeight?: number,
    shortcut?: BlockShortcut,
    nextElement?: FountainElementType,
    textAlign?: BlockTextAlign,
    casing?: BlockCasing,
    isBold?: boolean,
    isItalic?: boolean,
    isUnderline?: boolean,
};

export type PageSettings = {
    widthPx: number,
    heightPx: number,
    marginTopPx: number,
    marginRightPx: number,
    marginBottomPx: number,
    marginLeftPx: number,
    pageGapPx: number,
    pageBreakBackground: string,
    contentMarginTopPx?: number,
    contentMarginBottomPx?: number,
};

export type TypographySettings = {
    fontSizePx: number,
    lineHeight: number,
};

export type BlockSettings = Record<FountainElementType, BlockSpacingSettings>;

export type EditorSettings = {
    page: PageSettings,
    typography: TypographySettings,
    blocks: BlockSettings,
};

export type EditorSettingsOverride = Partial<{
    page: Partial<PageSettings>,
    typography: Partial<TypographySettings>,
    blocks: Partial<Record<FountainElementType, Partial<BlockSpacingSettings>>>,
}>;

const EDITOR_SETTINGS_BLOCK_TYPES = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_TRANSITION,
    ELEMENT_LYRICS,
    ELEMENT_CENTERED,
]);

const normalizeEditorSettingsBlockType = (value: string): FountainElementType | null => {
    if (value === 'fountain_lyric' || value === 'lyrics') {
        return ELEMENT_LYRICS;
    }

    if (value === ELEMENT_DUAL_DIALOGUE) {
        return ELEMENT_DIALOGUE;
    }

    return EDITOR_SETTINGS_BLOCK_TYPES.has(value as FountainElementType)
        ? value as FountainElementType
        : null;
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    page: {
        widthPx: 794, // A4 Width (8.27in * 96)
        heightPx: 1123, // A4 Height (11.69in * 96)
        marginTopPx: 96, // 1.0in
        marginRightPx: 96, // 1.0in
        marginBottomPx: 96, // 1.0in
        marginLeftPx: 144, // 1.5in
        pageGapPx: 32,
        pageBreakBackground: 'var(--color-surface)',
        contentMarginTopPx: 0,
        contentMarginBottomPx: 0,
    },
    typography: {
        fontSizePx: 16, // 12pt @ 96dpi (Results in ~9.6px char width for 10cpi)
        lineHeight: 1.0, // 6 lines per inch (16px line height)
    },
    blocks: {
        [ELEMENT_ACTION]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            shortcut: '2',
            nextElement: ELEMENT_ACTION,
            textAlign: 'left',
            casing: 'normal',
            isBold: false,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_SCENE_HEADING]: {
            spacingBeforeEm: 2.0,
            lineHeight: 1.0,
            shortcut: '1',
            nextElement: ELEMENT_ACTION,
            textAlign: 'left',
            casing: 'uppercase',
            isBold: true,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_CHARACTER]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            indentLeftChars: 20, // ~2.0in from margin (3.5in from edge)
            indentRightChars: 3, // ~0.3in from margin (1.3in from edge)
            shortcut: '3',
            nextElement: ELEMENT_DIALOGUE,
            textAlign: 'left',
            casing: 'uppercase',
            isBold: true,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_DUAL_DIALOGUE_CHARACTER]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            indentLeftChars: 20,
            indentRightChars: 3,
            shortcut: '9',
            nextElement: ELEMENT_DIALOGUE,
            textAlign: 'left',
            casing: 'uppercase',
            isBold: true,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_PARENTHETICAL]: {
            spacingBeforeEm: 0,
            lineHeight: 1.0,
            indentLeftChars: 16, // ~1.6in from margin (3.1in from edge)
            indentRightChars: 21, // ~2.1in from margin
            shortcut: '4',
            nextElement: ELEMENT_CHARACTER,
            textAlign: 'left',
            casing: 'normal',
            isBold: false,
            isItalic: true,
            isUnderline: false,
        },
        [ELEMENT_DIALOGUE]: {
            spacingBeforeEm: 0,
            lineHeight: 1.0,
            indentLeftChars: 10, // ~1.0in from margin (2.5in from edge)
            indentRightChars: 3, // ~0.3in from margin (1.3in from edge)
            shortcut: '5',
            nextElement: ELEMENT_CHARACTER,
            textAlign: 'left',
            casing: 'normal',
            isBold: false,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_DUAL_DIALOGUE]: {
            spacingBeforeEm: 0,
            lineHeight: 1.0,
            indentLeftChars: 10,
            indentRightChars: 3,
            shortcut: '5',
            nextElement: ELEMENT_CHARACTER,
            textAlign: 'left',
            casing: 'normal',
            isBold: false,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_TRANSITION]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            indentRightChars: 5, // ~0.5in from margin (1.5in from edge)
            shortcut: '6',
            nextElement: ELEMENT_SCENE_HEADING,
            textAlign: 'right',
            casing: 'uppercase',
            isBold: true,
            isItalic: false,
            isUnderline: false,
        },
        [ELEMENT_LYRICS]: {
            spacingBeforeEm: 0,
            lineHeight: 1.0,
            indentLeftChars: 10, // ~1.0in from margin (2.5in from edge)
            indentRightChars: 10,
            shortcut: '7',
            nextElement: ELEMENT_LYRICS,
            textAlign: 'left',
            casing: 'normal',
            isBold: false,
            isItalic: true,
            isUnderline: false,
        },
        [ELEMENT_CENTERED]: {
            shortcut: '8',
            nextElement: ELEMENT_CENTERED,
            textAlign: 'center',
            casing: 'normal',
            isBold: false,
            isItalic: true,
            isUnderline: false,
        },
    },
};

export const mergeEditorSettings = (
    base: EditorSettings,
    ...overrides: Array<EditorSettingsOverride | null | undefined>
): EditorSettings => {
    let next: EditorSettings = {
        page: {...base.page},
        typography: {...base.typography},
        blocks: {...base.blocks},
    };

    for (const override of overrides) {
        if (!override) {
            continue;
        }

        if (override.page) {
            const mergedPage = {
                ...next.page,
            };

            for (const [key, value] of Object.entries(override.page)) {
                if (value === undefined) {
                    continue;
                }

                mergedPage[key as keyof PageSettings] = value as never;
            }

            next.page = mergedPage;
        }

        if (override.typography) {
            const mergedTypography = {
                ...next.typography,
            };

            for (const [key, value] of Object.entries(override.typography)) {
                if (value === undefined) {
                    continue;
                }

                mergedTypography[key as keyof TypographySettings] = value as never;
            }

            next.typography = mergedTypography;
        }

        if (override.blocks) {
            const mergedBlocks: BlockSettings = {
                ...next.blocks,
            };

            for (const [blockType, blockOverrides] of Object.entries(override.blocks)) {
                if (!blockOverrides) {
                    continue;
                }

                const key = normalizeEditorSettingsBlockType(blockType);

                if (!key) {
                    continue;
                }

                const mergedBlock = {
                    ...mergedBlocks[key],
                };

                for (const [settingKey, settingValue] of Object.entries(blockOverrides)) {
                    if (settingValue === undefined) {
                        continue;
                    }

                    mergedBlock[settingKey as keyof BlockSpacingSettings] = settingValue as never;
                }

                mergedBlocks[key] = mergedBlock;
            }

            next = {
                ...next,
                blocks: mergedBlocks,
            };
        }
    }

    return next;
};

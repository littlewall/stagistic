import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/editor-core';

type BlockSpacingSettings = {
    spacingBeforeEm?: number,
    indentLeftChars?: number,
    indentRightChars?: number,
    fontSizePx?: number,
    lineHeight?: number,
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

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    page: {
        widthPx: 794, // A4 Width (8.27in * 96)
        heightPx: 1123, // A4 Height (11.69in * 96)
        marginTopPx: 96, // 1.0in
        marginRightPx: 88, // ~0.92in (To fit 61 chars content)
        marginBottomPx: 96, // 1.0in
        marginLeftPx: 120, // 1.25in
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
        },
        [ELEMENT_SCENE_HEADING]: {
            spacingBeforeEm: 2.0,
            lineHeight: 1.0,
        },
        [ELEMENT_CHARACTER]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            indentLeftChars: 20, // ~2.0in from margin (3.25in from edge)
            indentRightChars: 3, // ~0.3in from margin (1.45in from edge)
        },
        [ELEMENT_DUAL_DIALOGUE_CHARACTER]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            indentLeftChars: 20,
            indentRightChars: 3,
        },
        [ELEMENT_PARENTHETICAL]: {
            spacingBeforeEm: 0,
            lineHeight: 1.0,
            indentLeftChars: 16, // ~1.6in from margin
            indentRightChars: 21, // ~2.1in from margin
        },
        [ELEMENT_DIALOGUE]: {
            spacingBeforeEm: 0,
            lineHeight: 1.0,
            indentLeftChars: 10, // ~1.0in from margin (2.25in from edge)
            indentRightChars: 3, // ~0.3in from margin (1.45in from edge)
        },
        [ELEMENT_TRANSITION]: {
            spacingBeforeEm: 1.0,
            lineHeight: 1.0,
            indentRightChars: 5, // ~0.5in from margin
        },
        [ELEMENT_LYRICS]: {
            indentLeftChars: 10, // ~1.0in from margin (2.25in from edge)
            indentRightChars: 10,
        },
        [ELEMENT_CENTERED]: {},
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
            next.page = {
                ...next.page,
                ...override.page,
            };
        }

        if (override.typography) {
            next.typography = {
                ...next.typography,
                ...override.typography,
            };
        }

        if (override.blocks) {
            const mergedBlocks: BlockSettings = {
                ...next.blocks,
            };

            for (const [blockType, blockOverrides] of Object.entries(override.blocks)) {
                if (!blockOverrides) {
                    continue;
                }

                const key = blockType as FountainElementType;

                mergedBlocks[key] = {
                    ...mergedBlocks[key],
                    ...blockOverrides,
                };
            }

            next = {
                ...next,
                blocks: mergedBlocks,
            };
        }
    }

    return next;
};

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
    indentLeftPx?: number,
    indentRightPx?: number,
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
        widthPx: 794,
        heightPx: 1123,
        marginTopPx: 95,
        marginRightPx: 76,
        marginBottomPx: 95,
        marginLeftPx: 76,
        pageGapPx: 28,
        pageBreakBackground: 'var(--color-surface)',
        contentMarginTopPx: 0,
        contentMarginBottomPx: 0,
    },
    typography: {
        fontSizePx: 13,
        lineHeight: 1.7,
    },
    blocks: {
        [ELEMENT_ACTION]: {},
        [ELEMENT_SCENE_HEADING]: {},
        [ELEMENT_CHARACTER]: {
            spacingBeforeEm: 1.8,
            indentLeftPx: 56,
        },
        [ELEMENT_DUAL_DIALOGUE_CHARACTER]: {
            spacingBeforeEm: 1.8,
            indentLeftPx: 64,
        },
        [ELEMENT_PARENTHETICAL]: {
            indentLeftPx: 40,
            indentRightPx: 24,
        },
        [ELEMENT_DIALOGUE]: {
            indentLeftPx: 24,
        },
        [ELEMENT_TRANSITION]: {
            spacingBeforeEm: 1.8,
        },
        [ELEMENT_LYRICS]: {},
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

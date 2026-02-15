import type {FountainElementType} from '../fountain';
import type {
    BlockCasing,
    BlockShortcut,
    BlockTextAlign,
} from './options';

export type BlockSpacingSettings = {
    // Unitless multiplier of current block font size.
    spacingBeforeEm?: number,
    // Preferred screenplay indentation unit used in the editor.
    indentLeftChars?: number,
    indentRightChars?: number,
    // Optional legacy fallback for px-based indentation.
    indentLeftPx?: number,
    indentRightPx?: number,
    // Absolute block font size in CSS pixels.
    fontSizePx?: number,
    // Unitless line-height multiplier.
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
    // Page box dimensions in CSS pixels.
    widthPx: number,
    heightPx: number,
    // Page content margins in CSS pixels.
    marginTopPx: number,
    marginRightPx: number,
    marginBottomPx: number,
    marginLeftPx: number,
    // Vertical spacing between paginated pages in CSS pixels.
    pageGapPx: number,
    pageBreakBackground: string,
    // Optional extra content offsets in CSS pixels.
    contentMarginTopPx?: number,
    contentMarginBottomPx?: number,
};

export type TypographySettings = {
    // Base editor typography in CSS pixels + unitless line-height.
    fontSizePx: number,
    lineHeight: number,
};

export type VisualSettings = {
    characterColorSaturation: number,
};

export type BlockSettings = Record<FountainElementType, BlockSpacingSettings>;

export type EditorSettings = {
    page: PageSettings,
    typography: TypographySettings,
    visual: VisualSettings,
    blocks: BlockSettings,
};

export type EditorSettingsOverride = Partial<{
    page: Partial<PageSettings>,
    typography: Partial<TypographySettings>,
    visual: Partial<VisualSettings>,
    blocks: Partial<Record<FountainElementType, Partial<BlockSpacingSettings>>>,
}>;

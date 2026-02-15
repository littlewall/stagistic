import type {FountainElementType} from '../fountain';
import type {
    BlockCasing,
    BlockShortcut,
    BlockTextAlign,
} from './options';

export type BlockSpacingSettings = {
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

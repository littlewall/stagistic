import type {FountainElementType} from '../fountain';
import type {
    BlockCasing,
    BlockShortcut,
    BlockTextAlign,
} from './options';

export interface BlockSpacingSettings {
    // Unitless multiplier of current block font size.
    spacingBeforeEm?: number,
    spacingAfterEm?: number,
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
}

export interface PageSettings {
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
}

export interface TypographySettings {
    // Base editor typography in CSS pixels + unitless line-height.
    fontSizePx: number,
    lineHeight: number,
}

export interface VisualSettings {
    characterColorSaturation: number,
}

export interface StructureActDisplaySettings {
    linesBefore: number,
    linesAfter: number,
}

export interface StructureSettings {
    actDisplay: StructureActDisplaySettings,
}

export type BlockSettings = Record<FountainElementType, BlockSpacingSettings>;

export interface EditorSettings {
    page: PageSettings,
    typography: TypographySettings,
    visual: VisualSettings,
    structure: StructureSettings,
    blocks: BlockSettings,
}

export type BlockSettingsPatch = Partial<BlockSpacingSettings>;

export interface StructureSettingsPatch {
    actDisplay?: Partial<StructureActDisplaySettings>,
}

export interface EditorSettingsOverride {
    page?: Partial<PageSettings>,
    typography?: Partial<TypographySettings>,
    visual?: Partial<VisualSettings>,
    structure?: StructureSettingsPatch,
    blocks?: Partial<Record<FountainElementType, BlockSettingsPatch>>,
}

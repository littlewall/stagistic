import type {FountainElementType} from '../fountain';
import type {
    BlockCasing,
    BlockShortcut,
    BlockTextAlign,
} from './options';

export interface BlockSpacingSettings {
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

export interface MusicTypePrefixSettings {
    start: string,
    end: string,
}

export interface StructureActDisplaySettings {
    linesBefore: number,
    linesAfter: number,
}

export interface StructureMusicPrefixesSettings {
    song: MusicTypePrefixSettings,
    reprise: MusicTypePrefixSettings,
    underscore: MusicTypePrefixSettings,
}

export interface StructureSettings {
    actPrefix: string,
    actDisplay: StructureActDisplaySettings,
    musicPrefixes: StructureMusicPrefixesSettings,
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

export interface StructureMusicPrefixesPatch {
    song?: Partial<MusicTypePrefixSettings>,
    reprise?: Partial<MusicTypePrefixSettings>,
    underscore?: Partial<MusicTypePrefixSettings>,
}

export interface StructureSettingsPatch {
    actPrefix?: string,
    actDisplay?: Partial<StructureActDisplaySettings>,
    musicPrefixes?: StructureMusicPrefixesPatch,
}

export interface EditorSettingsOverride {
    page?: Partial<PageSettings>,
    typography?: Partial<TypographySettings>,
    visual?: Partial<VisualSettings>,
    structure?: StructureSettingsPatch,
    blocks?: Partial<Record<FountainElementType, BlockSettingsPatch>>,
}

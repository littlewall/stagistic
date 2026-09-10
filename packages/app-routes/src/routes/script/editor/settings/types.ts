import type {
    BlockCasing,
    BlockSettingsPatch,
    BlockShortcut,
    EditorSettings,
    EditorSettingsOverride,
    HeaderFooterSettingsPatch,
    InitialPagesSettingsPatch,
    PageSettings,
    ScriptBlockNodeType,
    StructureSettingsPatch,
    TitlePageSettings,
} from '@stagistic/script';
import type {FormSelectOption} from '@stagistic/ui';
import type {
    CSSProperties,
    ReactElement,
} from 'react';

export type {
    BlockSettingsPatch,
    StructureSettingsPatch,
};

export type PageSettingsPatch = Partial<PageSettings>;

export type UpdateBlockSettings = (
    blockType: ScriptBlockNodeType,
    patch: BlockSettingsPatch,
) => void;

export interface ElementsHandlers {
    onUpdateBlockSettings: UpdateBlockSettings,
}

interface ElementResetHandlers {
    onResetBlockSettings: (blockType: ScriptBlockNodeType) => void,
}

export interface VisualPreferencesHandlers {
    onUpdateCharacterColorSaturation: (value: number) => void,
}

export interface StructureHandlers {
    onUpdateStructureSettings: (patch: StructureSettingsPatch) => void,
}

export interface PageLayoutHandlers {
    onUpdatePageSettings: (patch: PageSettingsPatch) => void,
}

export interface HeaderFooterHandlers {
    onUpdateHeaderFooterSettings: (patch: HeaderFooterSettingsPatch) => void,
}

export interface InitialPagesHandlers {
    onUpdateInitialPagesSettings: (patch: InitialPagesSettingsPatch) => void,
}

export interface TitlePageHandlers {
    titlePageSettings: TitlePageSettings,
    scriptTitle: string,
    onUpdateScriptTitle: (title: string) => void,
    onUpdateTitlePage: (patch: Partial<TitlePageSettings>) => void,
}

export interface DangerZoneHandlers {
    scriptTitle: string,
    onDeleteScript: () => void | Promise<void>,
}

export interface ScriptEditorSettingsPanelProps {
    panelId: string,
    resolvedScriptSettings: EditorSettings,
    settingsOverride: EditorSettingsOverride,
    blockLabelByType: Map<ScriptBlockNodeType, string>,
    shortcutPrefix: string,
    elementsHandlers: ElementsHandlers & ElementResetHandlers,
    visualPreferencesHandlers: VisualPreferencesHandlers,
    structureHandlers: StructureHandlers,
    pageLayoutHandlers: PageLayoutHandlers,
    headerFooterHandlers: HeaderFooterHandlers,
    initialPagesHandlers: InitialPagesHandlers,
    titlePageHandlers: TitlePageHandlers,
    dangerZoneHandlers: DangerZoneHandlers,
}

export type SectionRenderer = (props: ScriptEditorSettingsPanelProps) => ReactElement;

export interface ElementSettingsPanelProps {
    blockType: ScriptBlockNodeType,
    blockLabel: string,
    resolvedScriptSettings: EditorSettings,
    canReset: boolean,
    shortcutPrefix: string,
    onResetBlockSettings: ElementResetHandlers['onResetBlockSettings'],
    onUpdateBlockSettings: UpdateBlockSettings,
}

export interface ElementFormattingModel {
    textAlign: 'left' | 'center' | 'right',
    casing: BlockCasing,
    isBold: boolean,
    isItalic: boolean,
    isUnderline: boolean,
}

export interface ElementNumericModel {
    spacingBefore: number,
    spacingAfter?: number,
    lineHeight: number,
    shortcut?: BlockShortcut,
    nextElement?: ScriptBlockNodeType,
    spacingBeforeOptions: FormSelectOption[],
    spacingAfterOptions?: FormSelectOption[],
    lineHeightOptions: FormSelectOption[],
    shortcutOptions?: FormSelectOption[],
    nextElementOptions?: FormSelectOption[],
}

export interface ElementPreviewModel {
    previewStyle: CSSProperties,
    previewText: string,
    sliderStart: number,
    sliderEnd: number,
    previewReferenceChars: number,
    minPreviewContentChars: number,
    zoneStartPercent: number,
    zoneEndPercent: number,
    leftTotalInches: number,
    rightTotalInches: number,
    contentChars: number,
    hasSpacingAfter: boolean,
}

export interface ElementPreviewHandlers {
    onStartChange: (value: number) => void,
    onEndChange: (value: number) => void,
}

export interface ElementSettingsViewModel {
    formatting: ElementFormattingModel,
    numeric: ElementNumericModel,
    preview: ElementPreviewModel,
}

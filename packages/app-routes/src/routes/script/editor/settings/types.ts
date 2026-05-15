import type {
    BlockSettingsPatch,
    BlockShortcut,
    EditorSettings,
    FountainElementType,
    PageSettings,
    StructureSettingsPatch,
} from '@stagistic/script';
import type {
    CSSProperties,
    ReactElement,
} from 'react';

import type {SettingsSelectOption} from './SettingsSelect';

export type {
    BlockSettingsPatch,
    StructureSettingsPatch,
};

export type PageSettingsPatch = Partial<PageSettings>;

export type UpdateBlockSettings = (
    blockType: FountainElementType,
    patch: BlockSettingsPatch,
) => void;

export interface ElementsHandlers {
    onUpdateBlockSettings: UpdateBlockSettings,
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

export interface ScriptEditorSettingsPanelProps {
    panelId: string,
    resolvedScriptSettings: EditorSettings,
    blockLabelByType: Map<FountainElementType, string>,
    shortcutPrefix: string,
    elementsHandlers: ElementsHandlers,
    visualPreferencesHandlers: VisualPreferencesHandlers,
    structureHandlers: StructureHandlers,
    pageLayoutHandlers: PageLayoutHandlers,
}

export type SectionRenderer = (props: ScriptEditorSettingsPanelProps) => ReactElement;

export interface ElementSettingsPanelProps {
    blockType: FountainElementType,
    blockLabel: string,
    resolvedScriptSettings: EditorSettings,
    shortcutPrefix: string,
    onUpdateBlockSettings: UpdateBlockSettings,
}

export interface ElementFormattingModel {
    textAlign: 'left' | 'center' | 'right',
    casing: 'normal' | 'uppercase',
    isBold: boolean,
    isItalic: boolean,
    isUnderline: boolean,
}

export interface ElementNumericModel {
    spacingBefore: number,
    spacingAfter?: number,
    lineHeight: number,
    shortcut?: BlockShortcut,
    nextElement?: FountainElementType,
    spacingBeforeOptions: SettingsSelectOption[],
    spacingAfterOptions?: SettingsSelectOption[],
    lineHeightOptions: SettingsSelectOption[],
    shortcutOptions?: SettingsSelectOption[],
    nextElementOptions?: SettingsSelectOption[],
}

export interface ElementPreviewModel {
    previewStyle: CSSProperties,
    previewText: string,
    sliderStart: number,
    sliderEnd: number,
    previewReferenceChars: number,
    minPreviewContentChars: number,
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

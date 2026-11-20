import type {EditorSettingsOverride} from '../settings/types';

export const FORMAT_TEMPLATE_IDS = [
    'stagistic-default',
    'dg-traditional',
    'dg-modern',
    'dg-musical',
    'samuel-french',
    'sketch-comedy',
] as const;
export type FormatTemplateId = typeof FORMAT_TEMPLATE_IDS[number];
export type ContinuationMark = 'none' | 'contd' | 'cont';

export interface PdfFlowPreset {
    actOnNewPage: boolean,
    sceneOnNewPage: boolean,
    repeatCharacterOnBreak: boolean,
    continuationMark: ContinuationMark,
}

export interface FormatTemplate {
    id: FormatTemplateId,
    label: string,
    /** One line shown under the name in the template picker. */
    description: string,
    settings: Pick<EditorSettingsOverride, 'blocks'>,
}

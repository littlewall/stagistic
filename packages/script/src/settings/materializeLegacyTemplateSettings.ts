import type {FormatTemplateId} from '../templates/types';
import {DEFAULT_EDITOR_SETTINGS} from './defaults';
import {mergeEditorSettings} from './merge';
import type {EditorSettingsOverride} from './types';

/**
 * Preserve the page profile of pre block-only locks, including archived payloads.
 * New applications always store page values, making this upgrade idempotent.
 */
export const materializeLegacyTemplateSettings = (id: FormatTemplateId | null, override: EditorSettingsOverride | null): EditorSettingsOverride => {
    if (!id || id === 'stagistic-default' || override?.page) return override ?? {};

    const sketch = id === 'sketch-comedy';
    const french = id === 'samuel-french';
    const legacy = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
        page: {
            widthPx: 816,
            heightPx: 1056,
            marginTopPx: 96,
            marginRightPx: 96,
            marginBottomPx: 96,
            marginLeftPx: sketch ? 96 : 144,
        },
        typography: {fontSizePx: 16, lineHeight: french ? 1 : sketch ? 1.13 : 1.2},
        pdfFlow: {
            actOnNewPage: !sketch,
            sceneOnNewPage: french,
            repeatCharacterOnBreak: true,
            continuationMark: french ? 'cont' : 'contd',
        },
    }, override, {
        headerFooter: {
            header: {right: {
                text: sketch ? '{{page}}' : '{{page}}.',
                isBold: false,
                isItalic: false,
                isUnderline: false,
                isHiddenInEditor: false,
            }},
            footer: {center: {
                text: '',
                isBold: false,
                isItalic: false,
                isUnderline: false,
                isHiddenInEditor: false,
            }},
        },
    });

    return {
        ...override,
        page: legacy.page,
        typography: legacy.typography,
        headerFooter: legacy.headerFooter,
        pdfFlow: legacy.pdfFlow,
    };
};

import {getFormatTemplate} from '../templates/registry';
import type {FormatTemplateId} from '../templates/types';
import {DEFAULT_EDITOR_SETTINGS} from './defaults';
import {materializeLegacyTemplateSettings} from './materializeLegacyTemplateSettings';
import {mergeEditorSettings} from './merge';
import {scriptOwnedSettings} from './scriptOwnedSettings';
import type {EditorSettings, EditorSettingsOverride} from './types';

export const resolveScriptEditorSettings = ({formatTemplateId, override}: {
    formatTemplateId: FormatTemplateId | null,
    override: EditorSettingsOverride | null,
}): EditorSettings => {
    const template = formatTemplateId ? getFormatTemplate(formatTemplateId) : undefined;

    if (!template) return mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, override);

    return mergeEditorSettings(
        DEFAULT_EDITOR_SETTINGS,
        template.settings,
        scriptOwnedSettings(materializeLegacyTemplateSettings(formatTemplateId, override)),
    );
};

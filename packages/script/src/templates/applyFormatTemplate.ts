import {DEFAULT_EDITOR_SETTINGS} from '../settings/defaults';
import {mergeEditorSettings} from '../settings/merge';
import {scriptOwnedSettings} from '../settings/scriptOwnedSettings';
import type {EditorSettingsOverride} from '../settings/types';
import {getFormatTemplate} from './registry';
import type {FormatTemplateId} from './types';

export interface ScriptFormatSelection {
    templateId: FormatTemplateId,
    lock: boolean,
}

export const applyFormatTemplate = ({templateId, lock}: ScriptFormatSelection, previous: EditorSettingsOverride | null = null) => {
    const template = getFormatTemplate(templateId);

    if (!template) throw new Error(`Unknown format template: ${templateId}`);

    const owned = scriptOwnedSettings(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, previous));

    return {
        formatTemplateId: lock ? templateId : null,
        settings: lock ? owned : mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, template.settings, owned),
    };
};

import {
    applyFormatTemplate,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type FormatTemplate,
    haveSameBlockStyles,
    mergeEditorSettings,
} from '@stagistic/script';
import type {ChangeSummaryItem} from '@stagistic/ui';

export const templateChanges = (current: EditorSettings, template: FormatTemplate): ChangeSummaryItem[] => {
    const next = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, applyFormatTemplate({templateId: template.id, lock: false}, current).settings);
    const changed = !haveSameBlockStyles(current, next);

    return changed ? [
        {
            tone: 'in',
            label: 'Block styles',
            text: 'Template indents, spacing and text styles',
        },
    ] : [];
};

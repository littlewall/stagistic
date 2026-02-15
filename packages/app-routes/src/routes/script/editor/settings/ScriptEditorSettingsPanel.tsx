import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
    SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
} from '../../settings/settingsMenu';
import {ElementSettingsPanel} from './ElementSettingsPanel';
import {PlaceholderSettingsPanel} from './PlaceholderSettingsPanel';
import {VisualPreferencesSettingsPanel} from './VisualPreferencesSettingsPanel';
import type {ScriptEditorSettingsPanelProps} from './types';

export const ScriptEditorSettingsPanel = ({
    panelId,
    resolvedScriptSettings,
    blockLabelByType,
    shortcutPrefix,
    onUpdateBlockSettings,
    onUpdateCharacterColorSaturation,
}: ScriptEditorSettingsPanelProps) => {
    if (panelId === SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES) {
        return (
            <VisualPreferencesSettingsPanel
                characterColorSaturation={resolvedScriptSettings.visual.characterColorSaturation}
                onUpdateCharacterColorSaturation={onUpdateCharacterColorSaturation}
            />
        );
    }

    if (!isElementSettingsPanelId(panelId)) {
        return <PlaceholderSettingsPanel panelId={panelId} />;
    }

    const blockType = getBlockTypeFromElementPanelId(panelId);

    if (!blockType) {
        return null;
    }

    return (
        <ElementSettingsPanel
            blockType={blockType}
            blockLabel={blockLabelByType.get(blockType) ?? 'Element'}
            resolvedScriptSettings={resolvedScriptSettings}
            shortcutPrefix={shortcutPrefix}
            onUpdateBlockSettings={onUpdateBlockSettings}
        />
    );
};

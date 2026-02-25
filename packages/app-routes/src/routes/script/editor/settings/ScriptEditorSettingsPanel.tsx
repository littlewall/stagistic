import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
    SCRIPT_SETTINGS_PANEL_PRODUCTION,
    SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS,
    SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
} from '../../settings/settingsMenu';
import {ElementSettingsPanel} from './ElementSettingsPanel';
import {PlaceholderSettingsPanel} from './PlaceholderSettingsPanel';
import {ProductionSettingsPanel} from './ProductionSettingsPanel';
import {StructureMarkersSettingsPanel} from './StructureMarkersSettingsPanel';
import type {ScriptEditorSettingsPanelProps} from './types';
import {VisualPreferencesSettingsPanel} from './VisualPreferencesSettingsPanel';

export const ScriptEditorSettingsPanel = ({
    panelId,
    resolvedScriptSettings,
    blockLabelByType,
    shortcutPrefix,
    production,
    onUpdateBlockSettings,
    onUpdateCharacterColorSaturation,
    onUpdateStructureSettings,
}: ScriptEditorSettingsPanelProps) => {
    if (panelId === SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES) {
        return (
            <VisualPreferencesSettingsPanel
                characterColorSaturation={resolvedScriptSettings.visual.characterColorSaturation}
                onUpdateCharacterColorSaturation={onUpdateCharacterColorSaturation}
            />
        );
    }

    if (panelId === SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS) {
        return (
            <StructureMarkersSettingsPanel
                structureSettings={resolvedScriptSettings.structure}
                onUpdateStructureSettings={onUpdateStructureSettings}
            />
        );
    }

    if (panelId === SCRIPT_SETTINGS_PANEL_PRODUCTION) {
        if (!production) {
            return <PlaceholderSettingsPanel panelId={panelId} />;
        }

        return (
            <ProductionSettingsPanel
                data={production.data}
                actions={production.actions}
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

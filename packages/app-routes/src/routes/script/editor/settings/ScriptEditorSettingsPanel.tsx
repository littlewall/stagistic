import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
    SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT,
    SCRIPT_SETTINGS_PANEL_STRUCTURE_MARKERS,
    SCRIPT_SETTINGS_PANEL_VISUAL_PREFERENCES,
} from '../../settings/settingsMenu';
import {ElementSettingsPanel} from './element/ElementSettingsPanel';
import {PageLayoutSettingsPanel} from './page-layout/PageLayoutSettingsPanel';
import {PlaceholderSettingsPanel} from './PlaceholderSettingsPanel';
import {StructureMarkersSettingsPanel} from './StructureMarkersSettingsPanel';
import type {ScriptEditorSettingsPanelProps} from './types';
import {VisualPreferencesSettingsPanel} from './visual-preferences/VisualPreferencesSettingsPanel';

export const ScriptEditorSettingsPanel = ({
    panelId,
    resolvedScriptSettings,
    blockLabelByType,
    shortcutPrefix,
    onUpdateBlockSettings,
    onUpdateCharacterColorSaturation,
    onUpdateStructureSettings,
    onUpdatePageSettings,
}: ScriptEditorSettingsPanelProps) => {
    if (panelId === SCRIPT_SETTINGS_PANEL_PAGE_LAYOUT) {
        return (
            <PageLayoutSettingsPanel
                resolvedScriptSettings={resolvedScriptSettings}
                onUpdatePageSettings={onUpdatePageSettings}
            />
        );
    }

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

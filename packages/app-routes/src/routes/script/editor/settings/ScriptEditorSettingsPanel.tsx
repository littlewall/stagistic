import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
} from '../../settings/settingsMenu';
import {ElementSettingsPanel} from './ElementSettingsPanel';
import {PlaceholderSettingsPanel} from './PlaceholderSettingsPanel';
import type {ScriptEditorSettingsPanelProps} from './types';

export const ScriptEditorSettingsPanel = ({
    panelId,
    resolvedScriptSettings,
    blockLabelByType,
    shortcutPrefix,
    onUpdateBlockSettings,
}: ScriptEditorSettingsPanelProps) => {
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

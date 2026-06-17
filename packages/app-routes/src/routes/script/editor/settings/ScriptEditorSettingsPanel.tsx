import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
} from '../../settings/settingsMenu';
import {ElementSettingsPanel} from './element/ElementSettingsPanel';
import {PlaceholderSettingsPanel} from './PlaceholderSettingsPanel';
import {SECTION_RENDERERS} from './registry';
import type {ScriptEditorSettingsPanelProps} from './types';

export const ScriptEditorSettingsPanel = (props: ScriptEditorSettingsPanelProps) => {
    const {
        panelId, resolvedScriptSettings, blockLabelByType, shortcutPrefix, elementsHandlers,
    } = props;

    const renderer = SECTION_RENDERERS[panelId];

    if (renderer) {
        return renderer(props);
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
            onResetBlockSettings={elementsHandlers.onResetBlockSettings}
            onUpdateBlockSettings={elementsHandlers.onUpdateBlockSettings}
        />
    );
};

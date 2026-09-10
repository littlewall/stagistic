import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
} from '../../settings/settingsMenu';
import {ElementSettingsPanel} from './element/ElementSettingsPanel';
import {SECTION_RENDERERS} from './registry';
import type {ScriptEditorSettingsPanelProps} from './types';

export const ScriptEditorSettingsPanel = (props: ScriptEditorSettingsPanelProps) => {
    const {
        panelId, resolvedScriptSettings, settingsOverride, blockLabelByType, shortcutPrefix, elementsHandlers,
    } = props;

    const renderer = SECTION_RENDERERS[panelId];

    if (renderer) {
        return renderer(props);
    }

    if (!isElementSettingsPanelId(panelId)) {
        return null;
    }

    const blockType = getBlockTypeFromElementPanelId(panelId);

    if (!blockType) {
        return null;
    }

    const blockOverride = settingsOverride.blocks?.[blockType];
    const canReset = blockOverride !== undefined && Object.keys(blockOverride).length > 0;

    return (
        <ElementSettingsPanel
            key={blockType}
            blockType={blockType}
            blockLabel={blockLabelByType.get(blockType) ?? 'Element'}
            resolvedScriptSettings={resolvedScriptSettings}
            canReset={canReset}
            shortcutPrefix={shortcutPrefix}
            onResetBlockSettings={elementsHandlers.onResetBlockSettings}
            onUpdateBlockSettings={elementsHandlers.onUpdateBlockSettings}
        />
    );
};

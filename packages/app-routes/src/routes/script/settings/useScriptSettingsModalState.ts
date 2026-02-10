import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {
    SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS,
    SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
    type ScriptSettingsPanelId,
    scriptSettingsMenu,
} from './settingsMenu';

export const useScriptSettingsModalState = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePanelId, setActivePanelId] = useState<ScriptSettingsPanelId>(SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO);
    const [expandedItemIds, setExpandedItemIds] = useState<string[]>([SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS]);
    const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);

    const open = useCallback(() => {
        setIsOpen(true);
    }, []);
    const close = useCallback(() => {
        setIsOpen(false);
    }, []);
    const selectPanel = useCallback((panelId: ScriptSettingsPanelId) => {
        setActivePanelId(panelId);
    }, []);
    const toggleExpanded = useCallback((itemId: string) => {
        setExpandedItemIds(previous => previous.includes(itemId)
            ? previous.filter(id => id !== itemId)
            : [...previous, itemId]);
    }, []);
    const toggleOverride = useCallback(() => {
        setIsOverrideEnabled(previous => !previous);
    }, []);

    const groups = useMemo(() => scriptSettingsMenu, []);

    return {
        isOpen,
        activePanelId,
        expandedItemIds,
        groups,
        isOverrideEnabled,
        open,
        close,
        selectPanel,
        toggleExpanded,
        toggleOverride,
    };
};


import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS,
    SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO,
    scriptSettingsMenu,
    type ScriptSettingsPanelId,
} from './settingsMenu';

export const useScriptSettingsModalState = () => {
    const returnFocus = useRef<HTMLElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [activePanelId, setActivePanelId] = useState<ScriptSettingsPanelId>(SCRIPT_SETTINGS_PANEL_DOCUMENT_INFO);
    const [expandedItemIds, setExpandedItemIds] = useState<string[]>([SCRIPT_SETTINGS_EXPANDABLE_ELEMENTS]);

    const open = useCallback((trigger?: HTMLElement | null) => {
        returnFocus.current = trigger ?? null;
        setIsOpen(true);
    }, []);
    const close = useCallback(() => {
        setIsOpen(false);
    }, []);
    const selectPanel = useCallback((panelId: ScriptSettingsPanelId) => {
        setActivePanelId(panelId);
    }, []);
    const toggleExpanded = useCallback((itemId: string) => {
        setExpandedItemIds(previous => {
            if (previous.includes(itemId)) {
                return previous.filter(id => id !== itemId);
            }

            return [...previous, itemId];
        });
    }, []);
    const groups = useMemo(() => scriptSettingsMenu, []);

    return {
        returnFocus,
        isOpen,
        activePanelId,
        expandedItemIds,
        groups,
        open,
        close,
        selectPanel,
        toggleExpanded,
    };
};

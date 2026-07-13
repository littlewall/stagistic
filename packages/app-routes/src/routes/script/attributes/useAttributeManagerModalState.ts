import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
    attributeManagerTabs,
} from './attributeManagerMenu';

export const useAttributeManagerModalState = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activePanelId, setActivePanelId] = useState<AttributeManagerPanelId>(
        ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    );
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    const open = useCallback(() => {
        setSelectedCharacterId(null);
        setIsOpen(true);
    }, []);
    const openWithPanel = useCallback((panelId: AttributeManagerPanelId) => {
        setSelectedCharacterId(null);
        setActivePanelId(panelId);
        setIsOpen(true);
    }, []);
    const openCharacter = useCallback((characterId: string) => {
        setSelectedCharacterId(characterId);
        setActivePanelId(ATTRIBUTE_MANAGER_PANEL_CHARACTERS);
        setIsOpen(true);
    }, []);
    const close = useCallback(() => {
        setIsOpen(false);
    }, []);
    const selectPanel = useCallback((panelId: string) => {
        setActivePanelId(panelId as AttributeManagerPanelId);
    }, []);
    const tabs = useMemo(() => attributeManagerTabs, []);

    return {
        isOpen,
        activePanelId,
        selectedCharacterId,
        tabs,
        open,
        openWithPanel,
        openCharacter,
        close,
        selectPanel,
    };
};

import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_CUES,
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
    const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

    const open = useCallback(() => {
        setSelectedCharacterId(null);
        setSelectedCueId(null);
        setIsOpen(true);
    }, []);
    const openWithPanel = useCallback((panelId: AttributeManagerPanelId) => {
        setSelectedCharacterId(null);
        setSelectedCueId(null);
        setActivePanelId(panelId);
        setIsOpen(true);
    }, []);
    const openCharacter = useCallback((characterId: string) => {
        setSelectedCharacterId(characterId);
        setSelectedCueId(null);
        setActivePanelId(ATTRIBUTE_MANAGER_PANEL_CHARACTERS);
        setIsOpen(true);
    }, []);
    const openCue = useCallback((cueId: string) => {
        setSelectedCharacterId(null);
        setSelectedCueId(cueId);
        setActivePanelId(ATTRIBUTE_MANAGER_PANEL_CUES);
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
        selectedCueId,
        tabs,
        open,
        openWithPanel,
        openCharacter,
        openCue,
        close,
        selectPanel,
    };
};

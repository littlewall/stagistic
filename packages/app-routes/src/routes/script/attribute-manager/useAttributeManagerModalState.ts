import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_MUSIC,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
    attributeManagerTabs,
} from './attributeManagerMenu';

export type AttributeManagerCharacterWorkspaceId = 'characters' | 'groups';

export const useAttributeManagerModalState = () => {
    const returnFocus = useRef<HTMLElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [activePanelId, setActivePanelId] = useState<AttributeManagerPanelId>(
        ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    );
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedMusicId, setSelectedMusicId] = useState<string | null>(null);
    const [initialWorkspaceId, setInitialWorkspaceId] = useState<AttributeManagerCharacterWorkspaceId>('characters');

    const open = useCallback((trigger?: HTMLElement | null) => {
        returnFocus.current = trigger ?? null;
        setSelectedCharacterId(null);
        setSelectedGroupId(null);
        setSelectedMusicId(null);
        setInitialWorkspaceId('characters');
        setIsOpen(true);
    }, []);
    const openWithPanel = useCallback((panelId: AttributeManagerPanelId, trigger?: HTMLElement | null) => {
        returnFocus.current = trigger ?? null;
        setSelectedCharacterId(null);
        setSelectedGroupId(null);
        setSelectedMusicId(null);
        setInitialWorkspaceId('characters');
        setActivePanelId(panelId);
        setIsOpen(true);
    }, []);
    const openCharacter = useCallback((characterId: string, trigger?: HTMLElement | null) => {
        returnFocus.current = trigger ?? null;
        setSelectedCharacterId(characterId);
        setSelectedGroupId(null);
        setSelectedMusicId(null);
        setInitialWorkspaceId('characters');
        setActivePanelId(ATTRIBUTE_MANAGER_PANEL_CHARACTERS);
        setIsOpen(true);
    }, []);
    const openGroup = useCallback((groupId: string, trigger?: HTMLElement | null) => {
        returnFocus.current = trigger ?? null;
        setSelectedCharacterId(null);
        setSelectedGroupId(groupId);
        setSelectedMusicId(null);
        setInitialWorkspaceId('groups');
        setActivePanelId(ATTRIBUTE_MANAGER_PANEL_CHARACTERS);
        setIsOpen(true);
    }, []);
    const openMusic = useCallback((musicId: string, trigger?: HTMLElement | null) => {
        returnFocus.current = trigger ?? null;
        setSelectedCharacterId(null);
        setSelectedGroupId(null);
        setSelectedMusicId(musicId);
        setInitialWorkspaceId('characters');
        setActivePanelId(ATTRIBUTE_MANAGER_PANEL_MUSIC);
        setIsOpen(true);
    }, []);
    const close = useCallback(() => {
        setIsOpen(false);
    }, []);
    const selectPanel = useCallback((panelId: string) => {
        if (panelId !== ATTRIBUTE_MANAGER_PANEL_CHARACTERS) {
            setSelectedGroupId(null);
            setInitialWorkspaceId('characters');
        }

        setActivePanelId(panelId as AttributeManagerPanelId);
    }, []);
    const tabs = useMemo(() => attributeManagerTabs, []);

    return {
        returnFocus,
        isOpen,
        activePanelId,
        selectedCharacterId,
        selectedGroupId,
        selectedMusicId,
        initialWorkspaceId,
        tabs,
        open,
        openWithPanel,
        openCharacter,
        openGroup,
        openMusic,
        close,
        selectPanel,
    };
};

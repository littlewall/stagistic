import {useCallback} from 'react';
import type {
    NavigateFunction,
    SetURLSearchParams,
} from 'react-router-dom';

import {
    type ScriptSettingsPanelId,
    SETTINGS_MODAL_QUERY_KEY,
} from './settings/settingsMenu';
import {useScriptSettingsModalQuerySync} from './settings/useScriptSettingsModalQuerySync';
import {useScriptSettingsModalState} from './settings/useScriptSettingsModalState';

interface UseScriptEditorSettingsModalArgs {
    currentScriptId: string | null | undefined,
    navigate: NavigateFunction,
    searchParams: URLSearchParams,
    setSearchParams: SetURLSearchParams,
    deleteScript: (scriptId: string) => Promise<void>,
}

export const useScriptEditorSettingsModal = ({
    currentScriptId,
    navigate,
    searchParams,
    setSearchParams,
    deleteScript,
}: UseScriptEditorSettingsModalArgs) => {
    const {
        isOpen: isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        open: openSettingsModal,
        close: closeSettingsModal,
        selectPanel,
        toggleExpanded,
    } = useScriptSettingsModalState();

    const handleSelectSettingsPanel = useCallback((panelId: string) => {
        selectPanel(panelId as ScriptSettingsPanelId);
    }, [selectPanel]);

    const handleDeleteScript = useCallback(async () => {
        if (!currentScriptId) {
            return;
        }

        void navigate('/', {replace: true});
        await deleteScript(currentScriptId);
    }, [
        currentScriptId,
        deleteScript,
        navigate,
    ]);

    const handleCloseSettings = useScriptSettingsModalQuerySync({
        queryKey: SETTINGS_MODAL_QUERY_KEY,
        searchParams,
        setSearchParams,
        openSettingsModal,
        closeSettingsModal,
    });

    return {
        isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        openSettingsModal,
        handleCloseSettings,
        handleSelectSettingsPanel,
        handleDeleteScript,
        toggleExpanded,
    };
};

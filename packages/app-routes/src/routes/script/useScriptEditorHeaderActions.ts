import type {ScriptListItem} from '@stagistic/app-core';
import {
    useCallback,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {CurrentScriptItem} from './types';

interface HeaderActionsParams {
    navigate: NavigateFunction,
    currentScript: CurrentScriptItem | null,
    openSettingsModal: () => void,
    openNewScript: () => void,
}

export const useScriptEditorHeaderActions = ({
    navigate,
    currentScript,
    openSettingsModal,
    openNewScript,
}: HeaderActionsParams) => {
    const handleSelectScript = useCallback((script: ScriptListItem) => {
        void navigate(`/script/${script.id}/editor`);
    }, [navigate]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleNewScript = useCallback(() => {
        openNewScript();
    }, [openNewScript]);
    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'scripts') {
            void navigate('/script/list');

            return;
        }

        if (actionId === 'settings' && currentScript) {
            openSettingsModal();

            return;
        }

        if (actionId === 'new-script') {
            openNewScript();
        }
    }, [
        currentScript,
        navigate,
        openSettingsModal,
        openNewScript,
    ]);

    return {
        handleSelectScript,
        handleHome,
        handleNewScript,
        handleMenuAction,
    };
};

import {useCallback} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import type {CurrentScriptItem} from './types';

interface HeaderActionsParams {
    navigate: NavigateFunction,
    currentScript: CurrentScriptItem | null,
    openSettingsModal: () => void,
}

export const useScriptEditorHeaderActions = ({
    navigate,
    currentScript,
    openSettingsModal,
}: HeaderActionsParams) => {
    const {openNewScript} = useGlobalModals();

    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'settings' && currentScript) {
            openSettingsModal();

            return;
        }
    }, [
        currentScript,
        navigate,
        openNewScript,
        openSettingsModal,
    ]);

    return {handleMenuAction};
};

import {
    type ScriptDocument,
    serializeStagistic,
    type TitlePageSettings,
} from '@stagistic/script';
import {useCallback} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {downloadStagistic} from './downloadStagistic';
import type {CurrentScriptItem} from './types';

interface HeaderActionsParams {
    navigate: NavigateFunction,
    currentScript: CurrentScriptItem | null,
    openSettingsModal: () => void,
    openAttributeManagerModal: () => void,
    getEditorValue: () => ScriptDocument | null,
    titlePage: TitlePageSettings,
}

export const useScriptEditorHeaderActions = ({
    navigate,
    currentScript,
    openSettingsModal,
    openAttributeManagerModal,
    getEditorValue,
    titlePage,
}: HeaderActionsParams) => {
    const {openNewScript} = useGlobalModals();

    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'settings' && currentScript) {
            openSettingsModal();

            return;
        }

        if (actionId === 'attributes' && currentScript) {
            openAttributeManagerModal();

            return;
        }

        if (actionId === 'export-stagistic' && currentScript) {
            const editorValue = getEditorValue();

            if (!editorValue) {
                return;
            }

            const content = serializeStagistic(editorValue, {
                scriptTitle: currentScript.name,
                titlePage,
            });

            downloadStagistic(currentScript.name, content);
        }
    }, [
        currentScript,
        getEditorValue,
        navigate,
        openNewScript,
        openAttributeManagerModal,
        openSettingsModal,
        titlePage,
    ]);

    return {handleMenuAction};
};

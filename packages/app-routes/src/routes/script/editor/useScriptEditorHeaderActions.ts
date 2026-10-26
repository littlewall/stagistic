import {exportScriptPackage, type ScriptRepository} from '@stagistic/app-core';
import {
    type ScriptDocument,
    serializeStagistic,
    type TitlePageSettings,
} from '@stagistic/script';
import {useCallback, useState} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import {downloadBlob, downloadStagistic} from '../../../shared/downloadStagistic';
import type {CurrentScriptItem} from '../workspace/types';

interface HeaderActionsParams {
    navigate: NavigateFunction,
    currentScript: CurrentScriptItem | null,
    openSettingsModal: (returnFocus?: HTMLElement | null) => void,
    openAttributeManagerModal: (returnFocus?: HTMLElement | null) => void,
    getEditorValue: () => ScriptDocument | null,
    titlePage: TitlePageSettings,
    scriptRepository: ScriptRepository,
    flushScript: () => Promise<void>,
}

export const useScriptEditorHeaderActions = ({
    currentScript,
    openSettingsModal,
    openAttributeManagerModal,
    getEditorValue,
    titlePage,
    scriptRepository,
    flushScript,
}: HeaderActionsParams) => {
    const [isPreparingPackage, setIsPreparingPackage] = useState(false);

    const handleMenuAction = useCallback(
        (actionId: string, returnFocus?: HTMLElement | null) => {
            if (actionId === 'settings' && currentScript) {
                openSettingsModal(returnFocus);

                return;
            }

            if (actionId === 'attributes' && currentScript) {
                openAttributeManagerModal(returnFocus);

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

                return;
            }

            if (actionId === 'export-stepkg' && currentScript) {
                setIsPreparingPackage(true);
                void new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
                    .then(() => exportScriptPackage({
                        repository: scriptRepository,
                        scriptId: currentScript.id,
                        flush: flushScript,
                        generator: {name: 'Stagistic', version: 'web'},
                    }))
                    .then(result => {
                        if (result.ok) {
                            downloadBlob(result.fileName, result.blob);
                        }
                    })
                    .catch(() => undefined)
                    .finally(() => setIsPreparingPackage(false));
            }
        },
        [
            currentScript,
            getEditorValue,
            openAttributeManagerModal,
            openSettingsModal,
            scriptRepository,
            titlePage,
            flushScript,
        ],
    );

    return {handleMenuAction, isPreparingPackage};
};

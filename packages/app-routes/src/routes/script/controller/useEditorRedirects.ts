import type {ScriptListItem} from '@stagistic/app-core';
import {
    useEffect,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {CurrentScriptItem} from '../types';

interface UseEditorRedirectsArgs {
    state: {
        scriptsLoading: boolean,
        scriptsError: unknown,
        recentScriptsData: ScriptListItem[],
        currentScript: CurrentScriptItem | null,
        scriptId: string | undefined,
    },
    navigation: {
        navigate: NavigateFunction,
    },
    requests: {
        seedDefaultScript: () => Promise<void>,
    },
}

export const useEditorRedirects = ({
    state,
    navigation,
    requests,
}: UseEditorRedirectsArgs) => {
    const {
        scriptsLoading,
        scriptsError,
        recentScriptsData,
        currentScript,
        scriptId,
    } = state;
    const {navigate} = navigation;
    const {seedDefaultScript} = requests;

    useEffect(() => {
        if (scriptsLoading) {
            return;
        }

        if (scriptsError) {
            return;
        }

        if (recentScriptsData.length === 0 && !currentScript) {
            void seedDefaultScript();

            return;
        }

        if (!scriptId) {
            if (recentScriptsData[0]) {
                void navigate(`/script/${recentScriptsData[0].id}/editor`, {replace: true});
            }

            return;
        }

        if (!currentScript && recentScriptsData[0]) {
            void navigate(`/script/${recentScriptsData[0].id}/editor`, {replace: true});
        }
    }, [
        currentScript,
        navigate,
        recentScriptsData,
        scriptsLoading,
        scriptsError,
        scriptId,
        seedDefaultScript,
    ]);
};

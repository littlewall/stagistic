import type {ScriptListItem} from '@stagistic/app-core';
import {
    useEffect,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {CurrentScriptItem} from './types';

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
}

export const useEditorRedirects = ({
    state,
    navigation,
}: UseEditorRedirectsArgs) => {
    const {
        scriptsLoading,
        scriptsError,
        recentScriptsData,
        currentScript,
        scriptId,
    } = state;
    const {navigate} = navigation;

    useEffect(() => {
        if (scriptsLoading) {
            return;
        }

        if (scriptsError) {
            return;
        }

        if (recentScriptsData.length === 0 && !currentScript) {
            void navigate('/', {replace: true});

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
    ]);
};

import {
    useEffect,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

type ScriptSummaryItem = {
    id: string,
};

type CurrentScript = {
    id: string,
    name: string,
} | null;

export const useEditorRedirects = (params: {
    scriptsLoading: boolean,
    scriptsError: unknown,
    recentScriptsData: ScriptSummaryItem[],
    currentScript: CurrentScript,
    scriptId: string | undefined,
    navigate: NavigateFunction,
    seedDefaultScript: () => Promise<void>,
}) => {
    const {
        scriptsLoading,
        scriptsError,
        recentScriptsData,
        currentScript,
        scriptId,
        navigate,
        seedDefaultScript,
    } = params;

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

import {useCallback, useEffect} from 'react';
import type {SetURLSearchParams} from 'react-router-dom';

type UseScriptSettingsModalQuerySyncArgs = {
    queryKey: string,
    searchParams: URLSearchParams,
    setSearchParams: SetURLSearchParams,
    openSettingsModal: () => void,
    closeSettingsModal: () => void,
};

export const useScriptSettingsModalQuerySync = ({
    queryKey,
    searchParams,
    setSearchParams,
    openSettingsModal,
    closeSettingsModal,
}: UseScriptSettingsModalQuerySyncArgs) => {
    useEffect(() => {
        if (searchParams.get(queryKey) !== '1') {
            return;
        }

        openSettingsModal();
    }, [
        openSettingsModal,
        queryKey,
        searchParams,
    ]);

    return useCallback(() => {
        closeSettingsModal();

        if (!searchParams.has(queryKey)) {
            return;
        }

        setSearchParams(previous => {
            const next = new URLSearchParams(previous);

            next.delete(queryKey);

            return next;
        }, {replace: true});
    }, [
        closeSettingsModal,
        queryKey,
        searchParams,
        setSearchParams,
    ]);
};

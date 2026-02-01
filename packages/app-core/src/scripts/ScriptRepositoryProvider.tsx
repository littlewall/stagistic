import type {ScriptRepository} from '@stagistic/sync-core';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
} from 'react';

import {createScriptsStore, type ScriptsStoreState} from './scriptsStore';

type ScriptRepositoryProviderProps = {
    repository: ScriptRepository,
    children: ReactNode,
};

const ScriptsContext = createContext<ScriptsStoreState | null>(null);

export const ScriptRepositoryProvider = ({
    repository,
    children,
}: ScriptRepositoryProviderProps) => {
    const store = useMemo(() => createScriptsStore(repository), [repository]);

    return (
        <ScriptsContext.Provider value={store}>
            {children}
        </ScriptsContext.Provider>
    );
};

export const useScriptsContext = () => {
    const context = useContext(ScriptsContext);

    if (!context) {
        throw new Error('useScriptsContext must be used within ScriptRepositoryProvider');
    }

    return context;
};

export const useScriptRepository = () => useScriptsContext().repository;

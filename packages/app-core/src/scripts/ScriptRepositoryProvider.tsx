import type {ScriptRepository} from '@stagistic/db';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
} from 'react';

import type {SnapshotViewRepository} from '../snapshots/createSnapshotViewRepository';
import {createScriptsStore, type ScriptsStoreState} from './scriptsStore';

type ScriptRepositoryProviderProps = {
    repository: ScriptRepository,
    /** Opens stored drafts and versions read-only; absent where viewing is unsupported. */
    snapshotViews?: SnapshotViewRepository | null,
    children: ReactNode,
};

const ScriptsContext = createContext<ScriptsStoreState | null>(null);
const SnapshotViewsContext = createContext<SnapshotViewRepository | null>(null);

export const ScriptRepositoryProvider = ({
    repository,
    snapshotViews = null,
    children,
}: ScriptRepositoryProviderProps) => {
    const store = useMemo(() => createScriptsStore(repository), [repository]);

    return (
        <SnapshotViewsContext.Provider value={snapshotViews}>
            <ScriptsContext.Provider value={store}>
                {children}
            </ScriptsContext.Provider>
        </SnapshotViewsContext.Provider>
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

export const useSnapshotViews = () => useContext(SnapshotViewsContext);

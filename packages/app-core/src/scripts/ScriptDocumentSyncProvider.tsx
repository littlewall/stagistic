import type {SyncEngineClient} from '@stagistic/sync-engine';
import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

/*
 * Optional: hosts with a local sync engine (web) bind the editor to shared
 * Y.Doc replicas. Without a provider (desktop, tests) scripts load and save
 * through the repository as before.
 */
const ScriptDocumentSyncContext = createContext<SyncEngineClient | null>(null);

export const ScriptDocumentSyncProvider = ({client, children}: {client: SyncEngineClient | null, children: ReactNode}) => (
    <ScriptDocumentSyncContext.Provider value={client}>
        {children}
    </ScriptDocumentSyncContext.Provider>
);

export const useScriptDocumentSync = () => useContext(ScriptDocumentSyncContext);

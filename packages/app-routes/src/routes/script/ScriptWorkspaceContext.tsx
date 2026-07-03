import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

import type {ScriptEditorController} from './controller/types';

const ScriptWorkspaceContext = createContext<ScriptEditorController | null>(null);

export const ScriptWorkspaceProvider = ({
    value,
    children,
}: {
    value: ScriptEditorController,
    children: ReactNode,
}) => (
    <ScriptWorkspaceContext.Provider value={value}>
        {children}
    </ScriptWorkspaceContext.Provider>
);

export const useScriptWorkspace = (): ScriptEditorController => {
    const context = useContext(ScriptWorkspaceContext);

    if (!context) {
        throw new Error('useScriptWorkspace must be used inside ScriptWorkspaceProvider');
    }

    return context;
};

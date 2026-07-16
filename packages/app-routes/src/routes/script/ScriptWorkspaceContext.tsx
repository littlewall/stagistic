import type {
    EditorSnapshotStore,
    EditorSurfaceCache,
} from '@stagistic/editor';
import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

import type {ScriptEditorController} from './controller/types';

export type ScriptWorkspaceValue = ScriptEditorController & {
    editorSurfaceCache: EditorSurfaceCache,
    editorSnapshotStore: EditorSnapshotStore,
};

const ScriptWorkspaceContext = createContext<ScriptWorkspaceValue | null>(null);

export const ScriptWorkspaceProvider = ({
    value,
    children,
}: {
    value: ScriptWorkspaceValue,
    children: ReactNode,
}) => (
    <ScriptWorkspaceContext.Provider value={value}>
        {children}
    </ScriptWorkspaceContext.Provider>
);

export const useScriptWorkspace = (): ScriptWorkspaceValue => {
    const context = useContext(ScriptWorkspaceContext);

    if (!context) {
        throw new Error('useScriptWorkspace must be used inside ScriptWorkspaceProvider');
    }

    return context;
};

import {
    createContext, type ReactNode, useContext,
} from 'react';

export interface EditorActCommands {
    insertAct: (beforeBlockId: string | null) => void,
    renameAct: (blockId: string, nextName: string) => void,
    deleteAct: (blockId: string) => void,
    moveScene: (sourceSceneBlockId: string, beforeBlockId: string | null) => void,
}

const EditorActCommandsContext = createContext<EditorActCommands | null>(null);

interface EditorActCommandsProviderProps {
    value: EditorActCommands,
    children: ReactNode,
}

export const EditorActCommandsProvider = ({value, children}: EditorActCommandsProviderProps) => (
    <EditorActCommandsContext.Provider value={value}>
        {children}
    </EditorActCommandsContext.Provider>
);

export const useEditorActCommands = (): EditorActCommands => {
    const context = useContext(EditorActCommandsContext);

    if (!context) {
        throw new Error('useEditorActCommands must be called inside a EditorActCommandsProvider');
    }

    return context;
};

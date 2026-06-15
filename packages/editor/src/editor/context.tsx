import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

const EditorInstanceContext = createContext<TiptapEditor | null>(null);

interface EditorInstanceProviderProps {
    editor: TiptapEditor | null,
    children: ReactNode,
}

export const EditorInstanceProvider = ({
    editor,
    children,
}: EditorInstanceProviderProps) => {
    return (
        <EditorInstanceContext.Provider value={editor}>
            {children}
        </EditorInstanceContext.Provider>
    );
};

export const useEditorInstance = (): TiptapEditor | null => {
    return useContext(EditorInstanceContext);
};

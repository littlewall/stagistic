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

/**
 * Returns the Tiptap editor instance from within a FountainEditor tree.
 * Can be used by sidebars, toolbars, and other editor-aware components to
 * call editor commands directly without prop drilling.
 */
export const useEditorInstance = (): TiptapEditor | null => {
    return useContext(EditorInstanceContext);
};

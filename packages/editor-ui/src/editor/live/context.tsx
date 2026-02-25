import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

import type {EditorSnapshotStore} from './store';

const EditorSnapshotStoreContext = createContext<EditorSnapshotStore | null>(null);

interface EditorSnapshotStoreProviderProps {
    store: EditorSnapshotStore,
    children: ReactNode,
}

export const EditorSnapshotStoreProvider = ({
    store,
    children,
}: EditorSnapshotStoreProviderProps) => {
    return (
        <EditorSnapshotStoreContext.Provider value={store}>
            {children}
        </EditorSnapshotStoreContext.Provider>
    );
};

export const useEditorSnapshotStore = () => {
    const store = useContext(EditorSnapshotStoreContext);

    if (!store) {
        throw new Error('useEditorSnapshotStore must be used within FountainEditor');
    }

    return store;
};

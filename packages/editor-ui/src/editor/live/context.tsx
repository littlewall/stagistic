import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

import type {EditorLiveStore} from './store';

const EditorLiveStoreContext = createContext<EditorLiveStore | null>(null);

interface EditorLiveStoreProviderProps {
    store: EditorLiveStore,
    children: ReactNode,
}

export const EditorLiveStoreProvider = ({
    store,
    children,
}: EditorLiveStoreProviderProps) => {
    return (
        <EditorLiveStoreContext.Provider value={store}>
            {children}
        </EditorLiveStoreContext.Provider>
    );
};

export const useEditorLiveStore = () => {
    const store = useContext(EditorLiveStoreContext);

    if (!store) {
        throw new Error('useEditorLiveStore must be used within FountainEditor');
    }

    return store;
};

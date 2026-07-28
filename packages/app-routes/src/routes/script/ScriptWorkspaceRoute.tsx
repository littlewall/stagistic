import {
    createEditorSnapshotStore,
    createEditorSurfaceCache,
    EditorSnapshotStoreProvider,
} from '@stagistic/editor';
import {LoaderOverlay} from '@stagistic/ui';
import {
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {Outlet, useParams} from 'react-router-dom';

import {ScriptWorkspaceProvider, type ScriptWorkspaceValue} from './ScriptWorkspaceContext';
import {ScriptSettingsModalProvider} from './settings/ScriptSettingsModalProvider';
import {useScriptEditorController} from './useScriptEditorController';

export const ScriptWorkspaceRoute = () => {
    const {scriptId} = useParams();
    const controller = useScriptEditorController(scriptId);
    const {
        editorLoadState, initialValue, storageError,
    } = controller;
    const editorSurfaceCache = useMemo(() => createEditorSurfaceCache(), []);
    const editorSnapshotStore = useMemo(() => createEditorSnapshotStore(), [scriptId]);
    const pendingCacheDestroyRef = useRef<number | null>(null);

    useEffect(() => {
        /*
         * Deferred + cancellable, so StrictMode's simulated remount does not
         * destroy the surface a mounted editor keeps using. Script switches
         * need no handling here: the next acquire() destroys the stale entry
         * (content is part of the surface signature).
         */
        if (pendingCacheDestroyRef.current !== null) {
            window.clearTimeout(pendingCacheDestroyRef.current);
            pendingCacheDestroyRef.current = null;
        }

        return () => {
            pendingCacheDestroyRef.current = window.setTimeout(() => {
                pendingCacheDestroyRef.current = null;
                editorSurfaceCache.destroy();
            }, 0);
        };
    }, [editorSurfaceCache]);

    const workspaceValue = useMemo<ScriptWorkspaceValue>(
        () => ({
            ...controller, editorSnapshotStore, editorSurfaceCache,
        }),
        [
            controller,
            editorSnapshotStore,
            editorSurfaceCache,
        ],
    );

    if (editorLoadState.isLoading || !initialValue) {
        return (
            <LoaderOverlay
                label="Preparing editor"
                messages={[
                    storageError
                    ?? editorLoadState.statusText
                    ?? 'Loading your script',
                ]}
                progress={editorLoadState.progress}
            />
        );
    }

    return (
        <ScriptWorkspaceProvider value={workspaceValue}>
            <EditorSnapshotStoreProvider store={editorSnapshotStore}>
                <ScriptSettingsModalProvider>
                    <Outlet />
                </ScriptSettingsModalProvider>
            </EditorSnapshotStoreProvider>
        </ScriptWorkspaceProvider>
    );
};

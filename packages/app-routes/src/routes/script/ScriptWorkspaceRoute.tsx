import {LoaderOverlay} from '@stagistic/ui';
import {Profiler, type ProfilerOnRenderCallback} from 'react';
import {Outlet, useParams} from 'react-router-dom';

import {ScriptWorkspaceProvider} from './ScriptWorkspaceContext';
import {useScriptEditorController} from './useScriptEditorController';

// TEMP: perf investigation
const logRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    // eslint-disable-next-line no-console
    console.log(`[perf] render ${id} (${phase}): ${Math.round(actualDuration)}ms`);
};

export const ScriptWorkspaceRoute = () => {
    const {scriptId} = useParams();
    const controller = useScriptEditorController(scriptId);
    const {editorLoadState, initialValue, storageError} = controller;

    if (editorLoadState.isLoading || !initialValue) {
        return (
            <LoaderOverlay
                title="Preparing editor"
                subtitle="Loading your script"
                progress={editorLoadState.progress}
                statusText={editorLoadState.statusText}
                hint={storageError ?? 'Please wait while we set up the editor.'}
            />
        );
    }

    return (
        <ScriptWorkspaceProvider value={controller}>
            {/* TEMP: perf investigation */}
            <Profiler id="script-view" onRender={logRender}>
                <Outlet />
            </Profiler>
        </ScriptWorkspaceProvider>
    );
};

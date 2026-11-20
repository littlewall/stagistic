import {useCallback} from 'react';
import {useNavigate} from 'react-router-dom';

import {createEditorFocusState} from '../workspace/editorFocusState';
import {getScriptBasePath, useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';

/** Opens the Editor of the shown script state, optionally at a block (a scene heading). */
export const useOpenInEditor = () => {
    const navigate = useNavigate();
    const {basePath} = useScriptReadOnlyState();
    const {currentScriptId} = useScriptWorkspace();
    const editorPath = `${basePath ?? getScriptBasePath(currentScriptId ?? '')}/editor`;

    return useCallback((focusBlockId?: string) => {
        void navigate(editorPath, {state: focusBlockId ? createEditorFocusState(focusBlockId) : undefined});
    }, [editorPath, navigate]);
};

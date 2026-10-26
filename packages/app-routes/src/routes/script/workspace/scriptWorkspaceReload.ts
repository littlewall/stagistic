import {useState} from 'react';
import {useLocation} from 'react-router-dom';

/** Navigation state key asking the script workspace to remount and reload from storage. */
export const SCRIPT_WORKSPACE_RELOAD_STATE = 'scriptWorkspaceReload';

/**
 * Workspace key that changes only when a navigation carries a new reload
 * token (e.g. after a restore replaced the script under an open editor).
 * Later navigations without a token keep the key, so switching views does not
 * remount the editor.
 */
export const useScriptWorkspaceReloadKey = () => {
    const location = useLocation();
    const state = location.state as Record<string, unknown> | null;
    const token = state?.[SCRIPT_WORKSPACE_RELOAD_STATE];
    const [key, setKey] = useState('initial');

    // Adjusting state while rendering: React re-renders before committing the old key.
    if (typeof token === 'number' && String(token) !== key) {
        setKey(String(token));
    }

    return typeof token === 'number' ? String(token) : key;
};

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {getScriptBasePath, useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';

/** Commands of a native Script menu; the shell maps its own menu ids onto these. */
export type ScriptMenuCommand = 'settings' | 'attributes' | 'export' | 'save';

interface ScriptMenuRegistration {
    /** The script header's menu handler: 'settings', 'attributes', 'export-stepkg'. */
    handleMenuAction: (actionId: string) => void,
    /** Route prefix of the shown script, e.g. /script/:id. */
    basePath: string,
}

interface ScriptMenuRegistry {
    register: (registration: ScriptMenuRegistration) => () => void,
    run: (command: ScriptMenuCommand) => void,
}

const ScriptMenuRegistryContext = createContext<ScriptMenuRegistry | null>(null);

const HEADER_ACTION: Record<Exclude<ScriptMenuCommand, 'export'>, string> = {
    settings: 'settings',
    attributes: 'attributes',
    save: 'export-stepkg',
};

/**
 * Lets a shell with a native menu (the Mac app) run the open script's header actions.
 * Script routes register while mounted; without this provider (the Web app) they do nothing.
 */
export const ScriptMenuActionsProvider = ({children}: {children: ReactNode}) => {
    const navigate = useNavigate();
    const current = useRef<ScriptMenuRegistration | null>(null);
    const register = useCallback((registration: ScriptMenuRegistration) => {
        current.current = registration;

        return () => {
            if (current.current === registration) {
                current.current = null;
            }
        };
    }, []);
    const run = useCallback((command: ScriptMenuCommand) => {
        const registration = current.current;

        if (!registration) {
            return;
        }

        if (command === 'export') {
            void navigate(`${registration.basePath}/export`);

            return;
        }

        registration.handleMenuAction(HEADER_ACTION[command]);
    }, [navigate]);
    const registry = useMemo(() => ({register, run}), [register, run]);

    return (
        <ScriptMenuRegistryContext.Provider value={registry}>
            {children}
        </ScriptMenuRegistryContext.Provider>
    );
};

/** Runs a Script menu command on the open script; a no-op while no script route is mounted. */
export const useRunScriptMenuCommand = (): (command: ScriptMenuCommand) => void => {
    const registry = useContext(ScriptMenuRegistryContext);

    return useCallback((command: ScriptMenuCommand) => registry?.run(command), [registry]);
};

/** Called by the script routes: exposes their header actions to the native Script menu while mounted. */
export const useRegisterScriptMenuActions = (handleMenuAction: (actionId: string) => void): void => {
    const registry = useContext(ScriptMenuRegistryContext);
    const {currentScriptId} = useScriptWorkspace();
    const {basePath} = useScriptReadOnlyState();
    const scriptBasePath = currentScriptId ? basePath ?? getScriptBasePath(currentScriptId) : null;

    useEffect(() => {
        if (!registry || !scriptBasePath) {
            return undefined;
        }

        return registry.register({handleMenuAction, basePath: scriptBasePath});
    }, [
        registry,
        scriptBasePath,
        handleMenuAction,
    ]);
};

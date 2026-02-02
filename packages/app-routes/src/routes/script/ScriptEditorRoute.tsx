import {FountainEditor} from '@stagistic/editor-ui';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
} from 'react';
import {
    useNavigate,
    useParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {useScriptEditorController} from './useScriptEditorController';

const AUTOSAVE_DELAY_MS = 1500;

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const {openNewScript} = useGlobalModals();
    const {
        scriptsLoading,
        currentScript,
        recentScripts,
        initialValue,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        handleAutoSave,
        handleManualSave,
    } = useScriptEditorController(scriptId);

    const scenes = useMemo(() => {
        return [];
    }, []);

    const handleSelectScript = useCallback((script: {id: string}) => {
        void navigate(`/script/${script.id}/editor`);
    }, [navigate]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleNewScript = useCallback(() => {
        openNewScript();
    }, [openNewScript]);
    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'scripts') {
            void navigate('/script/list');

            return;
        }

        if (actionId === 'settings' && currentScript) {
            void navigate(`/script/${currentScript.id}/settings`);

            return;
        }

        if (actionId === 'new-script') {
            openNewScript();
        }
    }, [currentScript, navigate, openNewScript]);
    const handleSceneClick = useCallback(() => {}, []);

    if (scriptsLoading || initialValue === undefined) {
        return null;
    }

    if (!currentScript) {
        return null;
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentScript={currentScript}
                    recentScripts={recentScripts}
                    onSelectScript={handleSelectScript}
                    onHome={handleHome}
                    onNewScript={handleNewScript}
                    scriptSyncState={saveIndicator}
                    onMenuAction={handleMenuAction}
                />
            )}
            sidebar={<EditorSidebar scenes={scenes} onSceneClick={handleSceneClick} />}
        >
            {storageError ? (
                <div role="alert" style={{padding: '12px 20px'}}>
                    {storageError}
                </div>
            ) : null}
            <FountainEditor
                initialValue={initialValue ?? undefined}
                onAutoSave={handleAutoSave}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
            />
        </AppLayout>
    );
};

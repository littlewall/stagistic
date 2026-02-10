import {FountainEditor} from '@stagistic/editor-ui';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
    LoaderOverlay,
} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import styles from './ScriptEditorRoute.module.css';
import {useScriptEditorController} from './useScriptEditorController';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const {openNewScript} = useGlobalModals();
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const {
        currentScript,
        recentScripts,
        initialValue,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
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
    }, [
        currentScript,
        navigate,
        openNewScript,
    ]);
    const handleSceneClick = useCallback(() => {}, []);
    const handleToggleLeftSidebar = useCallback(() => {
        setIsLeftSidebarOpen(previous => !previous);
    }, []);
    const handleToggleRightSidebar = useCallback(() => {
        setIsRightSidebarOpen(previous => !previous);
    }, []);

    const showEditorLoader = editorLoadState.isLoading || !initialValue;

    if (showEditorLoader) {
        return (
            <LoaderOverlay
                title="Připravuji editor"
                subtitle="Načítám scénář a editorové prostředí"
                progress={editorLoadState.progress}
                statusText={editorLoadState.statusText}
                hint={storageError ?? 'Prosím vyčkejte, připravujeme editor.'}
            />
        );
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentScript={currentScript ?? undefined}
                    recentScripts={recentScripts}
                    onSelectScript={handleSelectScript}
                    onHome={handleHome}
                    onNewScript={handleNewScript}
                    scriptSyncState={saveIndicator}
                    onMenuAction={handleMenuAction}
                />
            )}
        >
            {storageError ? (
                <div role="alert" style={{padding: '12px 20px'}}>
                    {storageError}
                </div>
            ) : null}
            <FountainEditor
                key={currentScript?.id ?? 'editor'}
                initialValue={initialValue}
                onAutoSave={handleAutoSave}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
                leftSidebarToggle={{
                    isOpen: isLeftSidebarOpen,
                    onToggle: handleToggleLeftSidebar,
                }}
                rightSidebarToggle={{
                    isOpen: isRightSidebarOpen,
                    onToggle: handleToggleRightSidebar,
                }}
                leftSidebar={<div className={styles.sidebarPlaceholder} />}
                rightSidebar={(
                    <EditorSidebar
                        scenes={scenes}
                        onSceneClick={handleSceneClick}
                        className={styles.sidebarContent}
                    />
                )}
                sidebarWidth={SIDEBAR_WIDTH}
            />
        </AppLayout>
    );
};

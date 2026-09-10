import {useScriptRepository} from '@stagistic/app-core';
import {
    type EditorMusicCreateRequest,
    type EditorMusicRemoveRequest,
    incrementRouteRenderCount,
    ScriptEditor,
} from '@stagistic/editor';
import {resolveDraftDate} from '@stagistic/script';
import {AppLayout, LoaderOverlay} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../useDocumentTitle';
import {ScriptCharactersSidebar} from './editor/characters/ScriptCharactersSidebar';
import {DeferredScriptEditor} from './editor/DeferredScriptEditor';
import {
    AddMusicModal,
    ScriptMusicSidebar,
    UnassignMusicModal,
} from './editor/music';
import {ConvertSceneHeadingModal} from './editor/scene/ConvertSceneHeadingModal';
import {DeleteSceneHeadingModal} from './editor/scene/DeleteSceneHeadingModal';
import {useSceneConversionState} from './editor/scene/useSceneConversionState';
import {useSceneDeletionState} from './editor/scene/useSceneDeletionState';
import {
    type SidebarPanel,
    useEditorSidebars,
} from './editor/sidebar';
import {
    ScriptStructureSidebar,
} from './editor/structure';
import {useScriptCharacters} from './ScriptCharactersContext';
import {ScriptSessionProvider} from './ScriptSessionContext';
import {useScriptWorkspace} from './ScriptWorkspaceContext';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalProvider';
import {useScriptEditorHeaderActions} from './useScriptEditorHeaderActions';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'var(--sidebar-width)';

type AddMusicModalState =
    | {source: 'sidebar'}
    | {source: 'editor', request: EditorMusicCreateRequest};

export const ScriptEditorRoute = () => {
    incrementRouteRenderCount();

    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {
        currentScript,
        currentScriptId,
        initialValue,
        initialIndexSnapshot,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        handleAutoSave,
        handleManualSave,
        editorSurfaceCache,
        editorSnapshotStore,
    } = useScriptWorkspace();
    const {
        resolvedScriptSettings,
        effectiveScriptSettingsDraft,
        isEditorPresentationHydrated,
        titlePageDraft,
        scriptTitleDraft,
        updateScriptTitle,
        musicState,
        openSettingsModal,
        openAttributeManagerModal,
        openAttributeManagerMusic,
    } = useScriptSettingsModal();

    useDocumentTitle(scriptTitleDraft);

    const [addMusicModalState, setAddMusicModalState] = useState<AddMusicModalState | null>(null);
    const [removeMusicRequest, setRemoveMusicRequest] = useState<EditorMusicRemoveRequest | null>(null);
    const {
        pendingSceneDelete,
        deleteSceneRequest,
        requestDeleteScene,
        closeSceneDeleteModal,
        confirmDeleteScene,
    } = useSceneDeletionState();
    const {
        pendingSceneConversion,
        convertSceneRequest,
        requestConvertScene,
        closeSceneConvertModal,
        confirmConvertScene,
    } = useSceneConversionState();
    const {
        music,
        createMusic,
        unassignMusic,
        markMusicAssigned,
        markMusicUnassigned,
        updateMusicRequest,
    } = musicState;

    const displayedCurrentScript = useMemo(
        () => currentScript ? {...currentScript, name: scriptTitleDraft} : null,
        [currentScript, scriptTitleDraft],
    );

    const {
        getEditorValue,
        editorOverrideValue,
        normalizedSpeakingEntityRecords,
        handleEditorValueChange: handleResolvedEditorValueChange,
    } = useScriptCharacters();

    const {handleMenuAction} = useScriptEditorHeaderActions({
        navigate,
        currentScript: displayedCurrentScript,
        openSettingsModal,
        openAttributeManagerModal,
        getEditorValue,
        titlePage: titlePageDraft,
    });
    const openAddMusicModal = useCallback(() => {
        setAddMusicModalState({source: 'sidebar'});
    }, []);
    const closeAddMusicModal = useCallback(() => {
        setAddMusicModalState(null);
    }, []);
    const cancelAddMusicModal = useCallback(() => {
        if (addMusicModalState?.source === 'editor') {
            addMusicModalState.request.cancel?.();
        }

        setAddMusicModalState(null);
    }, [addMusicModalState]);
    const handleRequestCreateMusic = useCallback((request: EditorMusicCreateRequest) => {
        setAddMusicModalState({
            source: 'editor',
            request,
        });
    }, []);
    const handleRequestRemoveMusic = useCallback((request: EditorMusicRemoveRequest) => {
        setRemoveMusicRequest(request);
    }, []);
    const handleCreateMusic = useCallback(async (input: Parameters<typeof createMusic>[0]) => {
        const createdMusic = await createMusic(input);

        if (createdMusic && addMusicModalState?.source === 'editor') {
            addMusicModalState.request.complete(createdMusic);
        }

        return createdMusic;
    }, [addMusicModalState, createMusic]);
    const handleConfirmRemoveMusic = useCallback(async () => {
        if (!removeMusicRequest) {
            return;
        }

        if (removeMusicRequest.complete()) {
            await unassignMusic(removeMusicRequest.musicId);
        }

        setRemoveMusicRequest(null);
    }, [removeMusicRequest, unassignMusic]);

    const sessionContextValue = useMemo(() => ({
        currentScriptId,
        scriptRepository,
        resolvedScriptSettings,
        indexSnapshot: initialIndexSnapshot ?? null,
        handleAutoSave,
    }), [
        currentScriptId,
        handleAutoSave,
        initialIndexSnapshot,
        resolvedScriptSettings,
        scriptRepository,
    ]);

    const sidebarPanels = useMemo<readonly SidebarPanel[]>(() => [
        {
            id: 'structure',
            label: 'Structure',
            renderContent: header => <ScriptStructureSidebar header={header} />,
        },
        {
            id: 'characters',
            label: 'Characters',
            renderContent: header => <ScriptCharactersSidebar header={header} />,
        },
        {
            id: 'music',
            label: 'Music',
            renderContent: header => (
                <ScriptMusicSidebar
                    header={header}
                    music={music}
                    isLoading={musicState.isLoading}
                    onAddMusic={openAddMusicModal}
                    onUnassignMusic={unassignMusic}
                />
            ),
        },
    ], [
        music,
        openAddMusicModal,
        unassignMusic,
    ]);
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebar,
        rightSidebar,
    } = useEditorSidebars({
        panels: sidebarPanels,
        defaultLeftPanelId: 'structure',
        defaultRightPanelId: 'characters',
        storageScope: currentScriptId ?? 'new-script',
    });
    const resolvedEditorInitialValue = editorOverrideValue ?? initialValue;

    /*
     * Mount the editor once every value used to lay out its first frame is
     * hydrated. Building it from defaults and replacing those values a moment
     * later makes the script surface visibly rebuild.
     */
    if (!resolvedEditorInitialValue || !isEditorPresentationHydrated) {
        return (
            <LoaderOverlay
                label="Preparing editor"
                messages={['Loading editor settings']}
            />
        );
    }

    return (
        <ScriptSessionProvider value={sessionContextValue}>
            <AppLayout
                footer={null}
                header={(
                    displayedCurrentScript ? (
                        <ScriptEditorAppHeader
                            currentScript={displayedCurrentScript}
                            scriptSyncState={saveIndicator}
                            onMenuAction={handleMenuAction}
                            onRenameScript={updateScriptTitle}
                            activeView="editor"
                        />
                    ) : (
                        <AppHeader />
                    )
                )}
            >
                {storageError ? (
                    <div role="alert" style={{padding: '12px 20px'}}>
                        {storageError}
                    </div>
                ) : null}
                <DeferredScriptEditor
                    key={currentScript?.id ?? 'editor'}
                    surfaceCache={editorSurfaceCache}
                    liveStore={editorSnapshotStore}
                    document={{
                        initialValue: resolvedEditorInitialValue,
                        persistentCharacters: normalizedSpeakingEntityRecords,
                        persistentMusic: music,
                        scriptTitle: scriptTitleDraft,
                        draftDate: resolveDraftDate(titlePageDraft),
                    }}
                    scriptSettings={effectiveScriptSettingsDraft}
                    save={{
                        onAutoSave: handleAutoSave,
                        onManualSave: handleManualSave,
                        autoSaveDelayMs: AUTOSAVE_DELAY_MS,
                    }}
                    requests={{
                        updateMusicRequest,
                        deleteSceneRequest,
                        convertSceneRequest,
                    }}
                    layout={{
                        autoFocus: shouldAutoFocus,
                        leftSidebarToggle,
                        rightSidebarToggle,
                        sidebarWidth: SIDEBAR_WIDTH,
                    }}
                    callbacks={{
                        onValueChange: handleResolvedEditorValueChange,
                        onRequestCreateMusic: handleRequestCreateMusic,
                        onRequestRemoveMusic: handleRequestRemoveMusic,
                        onOpenMusicManager: openAttributeManagerMusic,
                        onMusicAssigned: markMusicAssigned,
                        onMusicUnassigned: markMusicUnassigned,
                        onRequestDeleteScene: requestDeleteScene,
                        onRequestConvertScene: requestConvertScene,
                    }}
                >
                    <ScriptEditor.LeftSidebar>
                        {leftSidebar}
                    </ScriptEditor.LeftSidebar>
                    <ScriptEditor.RightSidebar>
                        {rightSidebar}
                    </ScriptEditor.RightSidebar>
                </DeferredScriptEditor>
                <AddMusicModal
                    isOpen={addMusicModalState !== null}
                    initialTitle={addMusicModalState?.source === 'editor'
                        ? addMusicModalState.request.title
                        : undefined}
                    onCancel={cancelAddMusicModal}
                    onClose={closeAddMusicModal}
                    onCreate={handleCreateMusic}
                />
                <UnassignMusicModal
                    isOpen={removeMusicRequest !== null}
                    musicTitle={removeMusicRequest?.title}
                    onClose={() => setRemoveMusicRequest(null)}
                    onConfirm={handleConfirmRemoveMusic}
                />
                <DeleteSceneHeadingModal
                    isOpen={pendingSceneDelete !== null}
                    onClose={closeSceneDeleteModal}
                    onConfirm={confirmDeleteScene}
                />
                <ConvertSceneHeadingModal
                    isOpen={pendingSceneConversion !== null}
                    onClose={closeSceneConvertModal}
                    onConfirm={confirmConvertScene}
                />
            </AppLayout>
        </ScriptSessionProvider>
    );
};

import {useScriptComments, useScriptRepository} from '@stagistic/app-core';
import {ScriptEditor} from '@stagistic/editor';
import {resolveDraftDate} from '@stagistic/script';
import {AppLayout, LoaderOverlay} from '@stagistic/ui';
import {useCallback, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../useDocumentTitle';
import {useCommentsEditorBridge, useCommentsPanelState} from './editor/comments';
import {DeferredScriptEditor} from './editor/DeferredScriptEditor';
import {
    AddMusicModal,
    UnassignMusicModal,
    useMusicModalsState,
} from './editor/music';
import {ConvertSceneHeadingModal} from './editor/scene/ConvertSceneHeadingModal';
import {DeleteSceneHeadingModal} from './editor/scene/DeleteSceneHeadingModal';
import {useSceneConversionState} from './editor/scene/useSceneConversionState';
import {useSceneDeletionState} from './editor/scene/useSceneDeletionState';
import {useEditorSidebars, useScriptSidebarPanels} from './editor/sidebar';
import {useScriptCharacters} from './ScriptCharactersContext';
import {ScriptSessionProvider} from './ScriptSessionContext';
import {useScriptWorkspace} from './ScriptWorkspaceContext';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalContext';
import {useScriptEditorHeaderActions} from './useScriptEditorHeaderActions';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'var(--sidebar-width)';

export const ScriptEditorRoute = () => {
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
        markMusicAssigned,
        markMusicUnassigned,
        updateMusicRequest,
    } = musicState;
    const comments = useScriptComments(currentScriptId, scriptRepository);
    const commentsPanelState = useCommentsPanelState();

    const displayedCurrentScript = useMemo(() => currentScript ? {...currentScript, name: scriptTitleDraft} : null, [currentScript, scriptTitleDraft]);

    const {
        getEditorValue,
        editorOverrideValue,
        normalizedSpeakingEntityRecords,
        handleEditorValueChange: handleResolvedEditorValueChange,
    } = useScriptCharacters();

    const {handleMenuAction, isPreparingPackage} = useScriptEditorHeaderActions({
        navigate,
        currentScript: displayedCurrentScript,
        openSettingsModal,
        openAttributeManagerModal,
        getEditorValue,
        titlePage: titlePageDraft,
        scriptRepository,
        flushScript: async () => {
            const editorValue = getEditorValue();

            if (!editorValue || !await handleManualSave(editorValue)) {
                throw new Error('Could not flush script before export.');
            }
        },
    });
    const musicModals = useMusicModalsState(musicState);

    const sessionContextValue = useMemo(
        () => ({
            currentScriptId,
            scriptRepository,
            resolvedScriptSettings,
            indexSnapshot: initialIndexSnapshot ?? null,
            handleAutoSave,
        }),
        [
            currentScriptId,
            handleAutoSave,
            initialIndexSnapshot,
            resolvedScriptSettings,
            scriptRepository,
        ],
    );

    const sidebarPanels = useScriptSidebarPanels({
        comments,
        commentsPanelState,
        musicState,
        onAddMusic: musicModals.addMusic.open,
    });
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebar,
        rightSidebar,
        revealPanel,
        isPanelOpen,
    } = useEditorSidebars({
        panels: sidebarPanels,
        defaultLeftPanelId: 'structure',
        defaultRightPanelId: 'characters',
        storageScope: currentScriptId ?? 'new-script',
    });
    const revealCommentsPanel = useCallback(() => revealPanel('comments', {side: 'right'}), [revealPanel]);
    const isCommentsPanelOpen = useCallback(() => isPanelOpen('comments'), [isPanelOpen]);
    const commentsBridge = useCommentsEditorBridge({
        comments,
        panelState: commentsPanelState,
        revealPanel: revealCommentsPanel,
        isPanelOpen: isCommentsPanelOpen,
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
                header={
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
                }
            >
                {isPreparingPackage ? (
                    <LoaderOverlay
                        variant="scrim"
                        label="Preparing package"
                        messages={[]}
                    />
                ) : null}
                {storageError ? (
                    <div
                        role="alert"
                        style={{padding: '12px 20px'}}
                    >
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
                        commentThreads: commentsBridge.commentThreads,
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
                        onRequestCreateMusic: musicModals.handleRequestCreateMusic,
                        onRequestRemoveMusic: musicModals.handleRequestRemoveMusic,
                        onOpenMusicManager: openAttributeManagerMusic,
                        onMusicAssigned: markMusicAssigned,
                        onMusicUnassigned: markMusicUnassigned,
                        onRequestDeleteScene: requestDeleteScene,
                        onRequestConvertScene: requestConvertScene,
                        ...commentsBridge.callbacks,
                    }}
                >
                    <ScriptEditor.LeftSidebar>{leftSidebar}</ScriptEditor.LeftSidebar>
                    <ScriptEditor.RightSidebar>{rightSidebar}</ScriptEditor.RightSidebar>
                </DeferredScriptEditor>
                <AddMusicModal
                    isOpen={musicModals.addMusic.isOpen}
                    initialTitle={musicModals.addMusic.initialTitle}
                    onCancel={musicModals.addMusic.cancel}
                    onClose={musicModals.addMusic.close}
                    onCreate={musicModals.addMusic.create}
                />
                <UnassignMusicModal
                    isOpen={musicModals.removeMusic.isOpen}
                    musicTitle={musicModals.removeMusic.musicTitle}
                    onClose={musicModals.removeMusic.close}
                    onConfirm={musicModals.removeMusic.confirm}
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

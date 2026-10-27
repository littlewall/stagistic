import {
    getScriptSnapshotLabel,
    useScriptComments,
    useScriptRepository,
} from '@stagistic/app-core';
import {ScriptEditor} from '@stagistic/editor';
import {resolveDraftDate} from '@stagistic/script';
import {AppLayout, LoaderOverlay} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../shared/useDocumentTitle';
import {useCommentsEditorBridge, useCommentsPanelState} from './editor/comments';
import {DeferredScriptEditor} from './editor/DeferredScriptEditor';
import {EditorFocusRequest} from './editor/EditorFocusRequest';
import {
    AddMusicModal,
    UnassignMusicModal,
    useMusicModalsState,
} from './editor/music';
import {ConvertSceneHeadingModal} from './editor/scene/ConvertSceneHeadingModal';
import {DeleteSceneHeadingModal} from './editor/scene/DeleteSceneHeadingModal';
import {useSceneConversionState} from './editor/scene/useSceneConversionState';
import {useSceneDeletionState} from './editor/scene/useSceneDeletionState';
import {useSearchPreferences} from './editor/search/useSearchPreferences';
import {useEditorSidebars, useScriptSidebarPanels} from './editor/sidebar';
import {useScriptEditorHeaderActions} from './editor/useScriptEditorHeaderActions';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalContext';
import {useScriptStateControls} from './states/useScriptStateControls';
import {useScriptAccess} from './workspace/ScriptAccessContext';
import {useScriptCharacters} from './workspace/ScriptCharactersContext';
import {ScriptSessionProvider} from './workspace/ScriptSessionContext';
import {useScriptWorkspace} from './workspace/ScriptWorkspaceContext';

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
        handleSummaryMetadataChange,
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

    const {
        isReadOnly,
        snapshot,
        liveScriptTitle,
    } = useScriptAccess();
    const shownTitle = isReadOnly ? liveScriptTitle ?? scriptTitleDraft : scriptTitleDraft;

    useDocumentTitle(snapshot ? `${shownTitle} — ${getScriptSnapshotLabel(snapshot)}` : shownTitle);

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
    const commentsPanelState = useCommentsPanelState(currentScriptId ?? 'new-script');
    const searchPreferences = useSearchPreferences(currentScriptId ?? 'new-script');

    const displayedCurrentScript = useMemo(() => currentScript ? {...currentScript, name: shownTitle} : null, [currentScript, shownTitle]);
    // Downloads of a saved draft or version carry its label in the file name.
    const exportedScript = useMemo(() => displayedCurrentScript && snapshot
        ? {...displayedCurrentScript, name: `${displayedCurrentScript.name} – ${getScriptSnapshotLabel(snapshot)}`}
        : displayedCurrentScript, [displayedCurrentScript, snapshot]);

    const {
        getEditorValue,
        editorOverrideValue,
        normalizedSpeakingEntityRecords,
        handleEditorValueChange: handleResolvedEditorValueChange,
    } = useScriptCharacters();

    const flushScript = useCallback(async () => {
        const editorValue = getEditorValue();

        if (!editorValue || !await handleManualSave(editorValue)) {
            throw new Error('Could not flush script before export.');
        }
    }, [getEditorValue, handleManualSave]);
    const {handleMenuAction, isPreparingPackage} = useScriptEditorHeaderActions({
        navigate,
        currentScript: exportedScript,
        openSettingsModal,
        openAttributeManagerModal,
        getEditorValue,
        titlePage: titlePageDraft,
        scriptRepository,
        flushScript,
    });
    // Switching states or saving a draft persists pending edits without the manual-save toast.
    const flushScriptQuietly = useCallback(async () => {
        const editorValue = getEditorValue();

        if (!editorValue || !await handleAutoSave(editorValue)) {
            throw new Error('Could not save the script.');
        }
    }, [getEditorValue, handleAutoSave]);
    const scriptStateControls = useScriptStateControls({
        scriptId: currentScriptId,
        view: 'editor',
        flush: flushScriptQuietly,
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
                            scriptSyncState={isReadOnly ? undefined : saveIndicator}
                            onMenuAction={handleMenuAction}
                            onRenameScript={isReadOnly ? undefined : updateScriptTitle}
                            activeView="editor"
                            scriptState={scriptStateControls.stateMenu}
                        />
                    ) : (
                        <AppHeader />
                    )
                }
            >
                {isPreparingPackage ? <LoaderOverlay variant="scrim" label="Preparing package" messages={[]} /> : null}
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
                    isReadOnly={isReadOnly}
                    readOnlyLabel={snapshot ? getScriptSnapshotLabel(snapshot) : null}
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
                    search={searchPreferences}
                    save={{
                        onAutoSave: handleAutoSave,
                        onManualSave: handleManualSave,
                        onSummaryMetadataChange: handleSummaryMetadataChange,
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
                    <ScriptEditor.LeftSidebar>
                        <>
                            {leftSidebar}
                            <EditorFocusRequest />
                        </>
                    </ScriptEditor.LeftSidebar>
                    <ScriptEditor.RightSidebar>{rightSidebar}</ScriptEditor.RightSidebar>
                </DeferredScriptEditor>
                <AddMusicModal
                    isOpen={musicModals.addMusic.isOpen}
                    initialTitle={musicModals.addMusic.initialTitle}
                    returnFocus={musicModals.addMusic.returnFocus}
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
                {scriptStateControls.modals}
            </AppLayout>
        </ScriptSessionProvider>
    );
};

import {useScriptRepository} from '@stagistic/app-core';
import {
    type EditorCueCreateRequest,
    type EditorCueRemoveRequest,
    incrementRouteRenderCount,
    ScriptEditor,
} from '@stagistic/editor';
import {resolveDraftDate} from '@stagistic/script';
import {AppLayout} from '@stagistic/ui';
import {
    useCallback,
    useDeferredValue,
    useMemo,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {ScriptCharactersSidebar} from './editor/characters/ScriptCharactersSidebar';
import {
    AddCueModal,
    ScriptCuesSidebar,
    UnassignCueModal,
} from './editor/cues';
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
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';

type AddCueModalState =
    | {source: 'sidebar'}
    | {source: 'editor', request: EditorCueCreateRequest};

export const ScriptEditorRoute = () => {
    incrementRouteRenderCount();

    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {
        currentScript,
        currentScriptId,
        recentScripts,
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
        titlePageDraft,
        scriptTitleDraft,
        cueState,
        openSettingsModal,
        openAttributeManagerModal,
        openAttributeManagerCue,
    } = useScriptSettingsModal();
    const [addCueModalState, setAddCueModalState] = useState<AddCueModalState | null>(null);
    const [removeCueRequest, setRemoveCueRequest] = useState<EditorCueRemoveRequest | null>(null);
    const deferredScriptSettingsDraft = useDeferredValue(effectiveScriptSettingsDraft);
    const {
        cues,
        createCue,
        deleteCue,
        markCueAssigned,
        markCueUnassigned,
        updateCueRequest,
        unassignCue,
    } = cueState;

    const displayedCurrentScript = useMemo(
        () => currentScript ? {...currentScript, name: scriptTitleDraft} : null,
        [currentScript, scriptTitleDraft],
    );

    const {
        getEditorValue,
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
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
    const openAddCueModal = useCallback(() => {
        setAddCueModalState({source: 'sidebar'});
    }, []);
    const closeAddCueModal = useCallback(() => {
        setAddCueModalState(null);
    }, []);
    const handleRequestCreateCue = useCallback((request: EditorCueCreateRequest) => {
        setAddCueModalState({
            source: 'editor',
            request,
        });
    }, []);
    const handleRequestRemoveCue = useCallback((request: EditorCueRemoveRequest) => {
        setRemoveCueRequest(request);
    }, []);
    const handleCreateCue = useCallback(async (input: Parameters<typeof createCue>[0]) => {
        const createdCue = await createCue(input);

        if (createdCue && addCueModalState?.source === 'editor') {
            addCueModalState.request.complete(createdCue);
        }

        return createdCue;
    }, [addCueModalState, createCue]);
    const handleConfirmRemoveCue = useCallback(async () => {
        if (!removeCueRequest) {
            return;
        }

        if (removeCueRequest.complete()) {
            await unassignCue(removeCueRequest.cueId);
        }

        setRemoveCueRequest(null);
    }, [removeCueRequest, unassignCue]);

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
            renderContent: () => <ScriptStructureSidebar />,
        },
        {
            id: 'characters',
            label: 'Characters',
            renderContent: () => <ScriptCharactersSidebar />,
        },
        {
            id: 'cues',
            label: 'Cues',
            renderContent: () => (
                <ScriptCuesSidebar
                    cues={cues}
                    onAddCue={openAddCueModal}
                    onDeleteCue={deleteCue}
                    onUnassignCue={unassignCue}
                />
            ),
        },
    ], [
        cues,
        deleteCue,
        openAddCueModal,
        unassignCue,
    ]);
    const {
        leftSidebarToggle,
        rightSidebarToggle,
        leftSidebarHeader,
        rightSidebarHeader,
        leftSidebar,
        rightSidebar,
    } = useEditorSidebars({
        panels: sidebarPanels,
        defaultLeftPanelId: 'structure',
        defaultRightPanelId: 'characters',
    });
    const resolvedEditorInitialValue = editorOverrideValue ?? initialValue;

    if (!resolvedEditorInitialValue) {
        return null;
    }

    return (
        <ScriptSessionProvider value={sessionContextValue}>
            <AppLayout
                header={(
                    displayedCurrentScript ? (
                        <ScriptEditorAppHeader
                            currentScript={displayedCurrentScript}
                            recentScripts={recentScripts}
                            scriptSyncState={saveIndicator}
                            onMenuAction={handleMenuAction}
                            activeView="editor"
                        />
                    ) : (
                        <AppHeader onMenuAction={handleMenuAction} />
                    )
                )}
            >
                {storageError ? (
                    <div role="alert" style={{padding: '12px 20px'}}>
                        {storageError}
                    </div>
                ) : null}
                <ScriptEditor
                    key={currentScript?.id ?? 'editor'}
                    surfaceCache={editorSurfaceCache}
                    liveStore={editorSnapshotStore}
                    document={{
                        initialValue: resolvedEditorInitialValue,
                        persistentCharacters: normalizedConfirmedCharacterRecords,
                        persistentCues: cues,
                        scriptTitle: scriptTitleDraft,
                        draftDate: resolveDraftDate(titlePageDraft),
                    }}
                    settings={{
                        scriptSettings: deferredScriptSettingsDraft,
                    }}
                    save={{
                        onAutoSave: handleAutoSave,
                        onManualSave: handleManualSave,
                        autoSaveDelayMs: AUTOSAVE_DELAY_MS,
                    }}
                    requests={{updateCueRequest}}
                    layout={{
                        autoFocus: shouldAutoFocus,
                        leftSidebarToggle,
                        rightSidebarToggle,
                        leftSidebarHeader,
                        rightSidebarHeader,
                        sidebarWidth: SIDEBAR_WIDTH,
                    }}
                    callbacks={{
                        onValueChange: handleResolvedEditorValueChange,
                        onRequestCreateCue: handleRequestCreateCue,
                        onRequestRemoveCue: handleRequestRemoveCue,
                        onOpenCueManager: openAttributeManagerCue,
                        onCueAssigned: markCueAssigned,
                        onCueUnassigned: markCueUnassigned,
                    }}
                >
                    <ScriptEditor.LeftSidebar>
                        {leftSidebar}
                    </ScriptEditor.LeftSidebar>
                    <ScriptEditor.RightSidebar>
                        {rightSidebar}
                    </ScriptEditor.RightSidebar>
                </ScriptEditor>
                <AddCueModal
                    isOpen={addCueModalState !== null}
                    initialTitle={addCueModalState?.source === 'editor'
                        ? addCueModalState.request.title
                        : undefined}
                    onClose={closeAddCueModal}
                    onCreate={handleCreateCue}
                />
                <UnassignCueModal
                    isOpen={removeCueRequest !== null}
                    cueTitle={removeCueRequest?.title}
                    onClose={() => setRemoveCueRequest(null)}
                    onConfirm={handleConfirmRemoveCue}
                />
            </AppLayout>
        </ScriptSessionProvider>
    );
};

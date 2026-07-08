import {useScriptRepository} from '@stagistic/app-core';
import {
    incrementRouteRenderCount,
    ScriptEditor,
} from '@stagistic/editor';
import {resolveDraftDate} from '@stagistic/script';
import {AppLayout} from '@stagistic/ui';
import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {AppHeader, ScriptEditorAppHeader} from '../../layout/AppHeader';
import {ScriptCharactersSidebar} from './editor/characters/ScriptCharactersSidebar';
import {
    type SidebarPanel,
    useEditorSidebars,
} from './editor/sidebar';
import {
    ScriptStructureSidebar,
    StructureSidebarContextActions,
} from './editor/structure';
import {ScriptCharactersProvider} from './ScriptCharactersContext';
import {ScriptSessionProvider} from './ScriptSessionContext';
import {useScriptWorkspace} from './ScriptWorkspaceContext';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalProvider';
import {useScriptCharactersContextValue} from './useScriptCharactersContextValue';
import {useScriptEditorHeaderActions} from './useScriptEditorHeaderActions';

const AUTOSAVE_DELAY_MS = 1500;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';

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
    } = useScriptWorkspace();
    const {
        resolvedScriptSettings,
        effectiveScriptSettingsDraft,
        titlePageDraft,
        scriptTitleDraft,
        openSettingsModal,
    } = useScriptSettingsModal();

    const displayedCurrentScript = useMemo(
        () => currentScript ? {...currentScript, name: scriptTitleDraft} : null,
        [currentScript, scriptTitleDraft],
    );

    const {
        getEditorValue,
        editorOverrideValue,
        normalizedConfirmedCharacterRecords,
        handleResolvedEditorValueChange,
        contextValue: charactersContextValue,
    } = useScriptCharactersContextValue({
        currentScriptId,
        scriptRepository,
        initialValue,
        resolvedScriptSettings,
        characterColorSaturation: resolvedScriptSettings.visual.characterColorSaturation,
        handleAutoSave,
    });

    const {handleMenuAction} = useScriptEditorHeaderActions({
        navigate,
        currentScript: displayedCurrentScript,
        openSettingsModal,
        getEditorValue,
        titlePage: titlePageDraft,
    });

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
            renderContextActions: () => <StructureSidebarContextActions />,
        }, {
            id: 'characters',
            label: 'Characters',
            renderContent: () => <ScriptCharactersSidebar />,
        },
    ], []);
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
            <ScriptCharactersProvider value={charactersContextValue}>
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
                        document={{
                            initialValue: resolvedEditorInitialValue,
                            persistentCharacters: normalizedConfirmedCharacterRecords,
                            scriptTitle: scriptTitleDraft,
                            draftDate: resolveDraftDate(titlePageDraft),
                        }}
                        settings={{
                            scriptSettings: effectiveScriptSettingsDraft,
                        }}
                        save={{
                            onAutoSave: handleAutoSave,
                            onManualSave: handleManualSave,
                            autoSaveDelayMs: AUTOSAVE_DELAY_MS,
                        }}
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
                        }}
                    >
                        <ScriptEditor.LeftSidebar>
                            {leftSidebar}
                        </ScriptEditor.LeftSidebar>
                        <ScriptEditor.RightSidebar>
                            {rightSidebar}
                        </ScriptEditor.RightSidebar>
                    </ScriptEditor>
                </AppLayout>
            </ScriptCharactersProvider>
        </ScriptSessionProvider>
    );
};

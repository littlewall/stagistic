import {
    useScriptRepository,
    useScripts,
} from '@stagistic/app-core';
import type {
    EditorSettings,
    EditorSettingsOverride,
    TitlePageSettings,
} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {
    AttributeManagerModal,
    ScriptSettingsModal,
} from '@stagistic/ui';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
} from 'react';
import {
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import {useAttributeManagerModalState} from '../attributes/useAttributeManagerModalState';
import {ScriptEditorSettingsPanel} from '../editor/settings';
import {useScriptWorkspace} from '../ScriptWorkspaceContext';
import {useScriptEditorSettingsDraft} from '../useScriptEditorSettingsDraft';
import {useScriptEditorSettingsModal} from '../useScriptEditorSettingsModal';
import {useScriptTitleDraft} from '../useScriptTitleDraft';
import {useTitlePageDraft} from '../useTitlePageDraft';
import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from './settingsMenu';

const BLOCK_LABEL_BY_TYPE = new Map(
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label] as const),
);

/*
 * Values every script view (editor, export, future ones) reads from the shared
 * settings host: the resolved settings that drive the view, plus the drafts and
 * the workspace modal entry points wired to the app header.
 */
interface ScriptSettingsModalContextValue {
    resolvedScriptSettings: EditorSettings,
    effectiveScriptSettingsDraft: EditorSettingsOverride,
    titlePageDraft: TitlePageSettings,
    scriptTitleDraft: string,
    openSettingsModal: () => void,
    openAttributeManagerModal: () => void,
}

const ScriptSettingsModalContext = createContext<ScriptSettingsModalContextValue | null>(null);

export const useScriptSettingsModal = (): ScriptSettingsModalContextValue => {
    const context = useContext(ScriptSettingsModalContext);

    if (!context) {
        throw new Error('useScriptSettingsModal must be used inside ScriptSettingsModalProvider');
    }

    return context;
};

/*
 * Owns the script settings/title-page/title drafts and the settings modal once,
 * at the workspace level, so every view shares a single modal and a single set
 * of debounced savers. Views open it via `useScriptSettingsModal().openSettingsModal`.
 */
export const ScriptSettingsModalProvider = ({children}: {children: ReactNode}) => {
    const navigate = useNavigate();
    const scriptRepository = useScriptRepository();
    const {deleteScript, renameScriptTitle} = useScripts();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        currentScript,
        currentScriptId,
        scriptSettingsOverride,
        handleSaveScriptSettingsOverride,
    } = useScriptWorkspace();

    const {
        effectiveScriptSettingsDraft,
        resolvedScriptSettings,
        updateBlockSettings,
        resetBlockSettings,
        updateCharacterColorSaturation,
        updateStructureSettings,
        updatePageSettings,
        updateHeaderFooterSettings,
    } = useScriptEditorSettingsDraft({
        state: {
            currentScriptId,
            scriptSettingsOverride,
        },
        requests: {
            handleSaveScriptSettingsOverride,
        },
    });
    const {
        titlePageDraft,
        updateTitlePage,
    } = useTitlePageDraft({
        currentScriptId,
        repository: scriptRepository,
    });
    const {
        scriptTitleDraft,
        updateScriptTitle,
    } = useScriptTitleDraft({
        currentScriptId,
        currentScriptTitle: currentScript?.name ?? '',
        renameScriptTitle,
    });

    const {
        isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        openSettingsModal,
        handleCloseSettings,
        handleSelectSettingsPanel,
        handleDeleteScript,
        toggleExpanded,
    } = useScriptEditorSettingsModal({
        currentScriptId,
        navigate,
        searchParams,
        setSearchParams,
        deleteScript,
    });
    const {
        isOpen: isAttributeManagerOpen,
        activePanelId: activeAttributeManagerPanelId,
        tabs: attributeManagerTabs,
        open: openAttributeManagerModal,
        close: closeAttributeManagerModal,
        selectPanel: selectAttributeManagerPanel,
    } = useAttributeManagerModalState();

    const shortcutPrefix = isApplePlatform() ? 'Option' : 'Alt';

    const contextValue = useMemo<ScriptSettingsModalContextValue>(() => ({
        resolvedScriptSettings,
        effectiveScriptSettingsDraft,
        titlePageDraft,
        scriptTitleDraft,
        openSettingsModal,
        openAttributeManagerModal,
    }), [
        effectiveScriptSettingsDraft,
        openAttributeManagerModal,
        openSettingsModal,
        resolvedScriptSettings,
        scriptTitleDraft,
        titlePageDraft,
    ]);

    return (
        <ScriptSettingsModalContext.Provider value={contextValue}>
            {children}
            <ScriptSettingsModal
                isOpen={isSettingsOpen}
                title="Settings"
                groups={groups}
                activePanelId={activePanelId}
                expandedItemIds={expandedItemIds}
                onClose={handleCloseSettings}
                onSelectPanel={handleSelectSettingsPanel}
                onToggleExpand={toggleExpanded}
            >
                <ScriptEditorSettingsPanel
                    panelId={activePanelId}
                    resolvedScriptSettings={resolvedScriptSettings}
                    blockLabelByType={BLOCK_LABEL_BY_TYPE}
                    shortcutPrefix={shortcutPrefix}
                    elementsHandlers={{
                        onResetBlockSettings: resetBlockSettings,
                        onUpdateBlockSettings: updateBlockSettings,
                    }}
                    visualPreferencesHandlers={{onUpdateCharacterColorSaturation: updateCharacterColorSaturation}}
                    structureHandlers={{onUpdateStructureSettings: updateStructureSettings}}
                    pageLayoutHandlers={{onUpdatePageSettings: updatePageSettings}}
                    headerFooterHandlers={{onUpdateHeaderFooterSettings: updateHeaderFooterSettings}}
                    titlePageHandlers={{
                        titlePageSettings: titlePageDraft,
                        scriptTitle: scriptTitleDraft,
                        onUpdateScriptTitle: updateScriptTitle,
                        onUpdateTitlePage: updateTitlePage,
                    }}
                    dangerZoneHandlers={{
                        scriptTitle: scriptTitleDraft,
                        onDeleteScript: handleDeleteScript,
                    }}
                />
            </ScriptSettingsModal>
            <AttributeManagerModal
                isOpen={isAttributeManagerOpen}
                tabs={attributeManagerTabs}
                activeTabId={activeAttributeManagerPanelId}
                onClose={closeAttributeManagerModal}
                onSelectTab={selectAttributeManagerPanel}
            />
        </ScriptSettingsModalContext.Provider>
    );
};

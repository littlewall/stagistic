import type {
    EditorSettingsOverride,
    ScriptDocument,
} from '@stagistic/script-core';
import type {ScriptSyncState} from '@stagistic/ui';

export type EditorLoadState = {
    progress: number,
    statusText: string,
    isLoading: boolean,
};

export type ScriptEditorController = {
    scriptsLoading: boolean,
    scriptsError: unknown,
    currentScript: {id: string, name: string} | null,
    currentScriptId: string | null,
    recentScripts: {id: string, name: string}[],
    initialValue: ScriptDocument | null | undefined,
    scriptSettingsOverride: EditorSettingsOverride | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    saveIndicator: ScriptSyncState,
    editorLoadState: EditorLoadState,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
    handleManualSave: (value: ScriptDocument) => Promise<boolean>,
    handleSaveScriptSettingsOverride: (settings?: EditorSettingsOverride) => Promise<boolean>,
};

export const isEditorSettingsOverrideEmpty = (value?: EditorSettingsOverride | null) => {
    if (!value) {
        return true;
    }

    const hasPage = Boolean(value.page && Object.keys(value.page).length > 0);
    const hasTypography = Boolean(value.typography && Object.keys(value.typography).length > 0);
    const hasVisual = Boolean(value.visual && Object.values(value.visual).some(item => item !== undefined));
    const hasStructure = Boolean(value.structure && Object.keys(value.structure).length > 0);
    const hasBlocks = Boolean(value.blocks && Object.keys(value.blocks).length > 0);

    return !(hasPage || hasTypography || hasVisual || hasStructure || hasBlocks);
};

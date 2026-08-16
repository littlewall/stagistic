import type {
    useScriptCharacterCatalog,
    useScriptMusic,
} from '@stagistic/app-core';
import type {
    EditorSettingsOverride,
    ScriptBlockIndexSnapshot,
    ScriptDocument,
} from '@stagistic/script';
import type {ScriptSyncState} from '@stagistic/ui';

import type {CurrentScriptItem} from '../types';

export type EditorLoadState = {
    progress: number,
    statusText: string,
    isLoading: boolean,
};

export type ScriptEditorController = {
    scriptsLoading: boolean,
    scriptsError: unknown,
    currentScript: CurrentScriptItem | null,
    currentScriptId: string | null,
    characterCatalog: ReturnType<typeof useScriptCharacterCatalog>,
    musicCatalog: ReturnType<typeof useScriptMusic>,
    initialValue: ScriptDocument | null | undefined,
    initialIndexSnapshot: ScriptBlockIndexSnapshot | null | undefined,
    storageError: string | null,
    shouldAutoFocus: boolean,
    saveIndicator: ScriptSyncState,
    editorLoadState: EditorLoadState,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
    handleManualSave: (value: ScriptDocument) => Promise<boolean>,
};

const hasDefinedLeaf = (value: unknown): boolean => {
    if (value === undefined || value === null) {
        return false;
    }

    if (typeof value !== 'object') {
        return true;
    }

    return Object.values(value).some(hasDefinedLeaf);
};

export const isEditorSettingsOverrideEmpty = (
    value?: EditorSettingsOverride | null,
) => !hasDefinedLeaf(value);

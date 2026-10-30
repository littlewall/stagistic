import {buildScriptSummaryMetadata, type EditorSettingsOverride} from '@stagistic/script';
import {useSyncExternalStore} from 'react';

import type {EditorProps, EditorSaveCallbacks} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {getMeasuredEditorPageCount} from '../hooks/editorSaveSnapshot';
import type {EditorSurfaceCache} from '../surface/editorSurfaceCache';
import type {ScriptDocumentSession} from './createScriptDocumentSession';

export const getSessionSurfaceOptions = (session: ScriptDocumentSession | undefined, cache: EditorSurfaceCache | undefined, signature: string) => ({
    surfaceCache: session ? undefined : cache,
    providedEditor: session?.getEditor() ?? undefined,
    signature: session ? 'document-session' : signature,
});

export const getSessionSaveOptions = (session: ScriptDocumentSession | undefined, save: EditorProps['save']) => ({
    ...save,
    onAutoSave: session ? undefined : save?.onAutoSave,
    onManualSave: session ? undefined : save?.onManualSave,
});

export const getSessionManualSave = (session: ScriptDocumentSession | undefined, onManualSave: EditorSaveCallbacks['onManualSave'], fallback: () => Promise<void>, settings?: EditorSettingsOverride) => {
    if (!session) return fallback;

    return async () => {
        if (!onManualSave) return;

        await session.saveManual(async value => {
            const editor = session.getEditor();
            const currentValue = editor && !editor.isDestroyed ? stripScriptSettings(editor.getJSON() as typeof value) : null;
            const pageCount = editor && currentValue && JSON.stringify(currentValue) === JSON.stringify(value) ? getMeasuredEditorPageCount(editor) : null;

            return await onManualSave(value, buildScriptSummaryMetadata(value, pageCount), settings ?? null) !== false;
        });
    };
};

const subscribeNothing = () => () => {};
const cleanSnapshot = () => false;

export const useSessionDirty = (session: ScriptDocumentSession | undefined) => useSyncExternalStore(
    session?.subscribe ?? subscribeNothing,
    session ? () => session.getSnapshot().isDirty : cleanSnapshot,
    cleanSnapshot,
);

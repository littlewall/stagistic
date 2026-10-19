import type {
    EditorSettingsOverride,
    ScriptDocument,
    ScriptSummaryMetadata,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/core';
import {useCallback, useRef} from 'react';

import type {EditorProps} from '../contracts';
import {captureEditorSaveSnapshot} from './editorSaveSnapshot';
import {useAutosaveController} from './useAutosaveController';
import {useEditorSummaryMetadata} from './useEditorSummaryMetadata';

type UseEditorAutosaveArgs = NonNullable<EditorProps['save']> & {
    onValueChange?: NonNullable<EditorProps['callbacks']>['onValueChange'],
    scriptSettings?: EditorSettingsOverride,
};

/** Wires the autosave controller to the live editor, flushing pagination before reading its value. */
export const useEditorAutosave = (editor: TiptapEditor | null, {
    onAutoSave,
    onManualSave,
    onDirtyChange,
    onSummaryMetadataChange,
    autoSaveDelayMs,
    onValueChange,
    scriptSettings,
}: UseEditorAutosaveArgs) => {
    const dirtyRef = useRef(false);
    const metadataByValueRef = useRef(new WeakMap<ScriptDocument, {
        metadata: ScriptSummaryMetadata,
        settings: EditorSettingsOverride | null,
    }>());

    const refreshSummaryMetadata = useEditorSummaryMetadata(editor, dirtyRef, onSummaryMetadataChange, scriptSettings);

    const resolveLatestValue = useCallback(() => {
        if (!editor) {
            return null;
        }

        const {value, metadata} = captureEditorSaveSnapshot(editor);

        metadataByValueRef.current.set(value, {metadata, settings: scriptSettings ?? null});

        return value;
    }, [editor, scriptSettings]);

    return useAutosaveController({
        onAutoSave: onAutoSave && (value => {
            const snapshot = metadataByValueRef.current.get(value);

            return onAutoSave(value, snapshot?.metadata, snapshot?.settings);
        }),
        onManualSave: onManualSave && (value => {
            const snapshot = metadataByValueRef.current.get(value);

            return onManualSave(value, snapshot?.metadata, snapshot?.settings);
        }),
        onDirtyChange: isDirty => {
            dirtyRef.current = isDirty;
            onDirtyChange?.(isDirty);
            if (!isDirty) {
                refreshSummaryMetadata();
            }
        },
        autoSaveDelayMs,
        resolveLatestValue,
        onValueSynced: (value, revision) => {
            onValueChange?.(value, {source: 'typing', revision});
        },
    });
};

import type {ScriptDocument} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/core';
import {useCallback} from 'react';

import type {EditorProps} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {useAutosaveController} from './useAutosaveController';

type UseEditorAutosaveArgs = NonNullable<EditorProps['save']> & {
    onValueChange?: NonNullable<EditorProps['callbacks']>['onValueChange'],
};

/** Wires the autosave controller to the live editor, flushing pagination before reading its value. */
export const useEditorAutosave = (editor: TiptapEditor | null, {
    onAutoSave,
    onManualSave,
    onDirtyChange,
    autoSaveDelayMs,
    onValueChange,
}: UseEditorAutosaveArgs) => {
    const resolveLatestValue = useCallback(() => {
        if (!editor) {
            return null;
        }

        const paginationCommands = editor.commands as {
            forcePaginationRecalc?: () => boolean,
        };

        paginationCommands.forcePaginationRecalc?.();

        return stripScriptSettings(editor.getJSON() as ScriptDocument);
    }, [editor]);

    return useAutosaveController({
        onAutoSave,
        onManualSave,
        onDirtyChange,
        autoSaveDelayMs,
        resolveLatestValue,
        onValueSynced: (value, revision) => {
            onValueChange?.(value, {source: 'typing', revision});
        },
    });
};

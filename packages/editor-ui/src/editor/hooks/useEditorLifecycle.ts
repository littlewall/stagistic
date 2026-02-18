import {
    normalizeScriptStructure,
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    useEffect,
    useRef,
} from 'react';

import {stripScriptSettings} from '../editorSettings';
import {type SaveResult} from './useAutosaveController';
import {useEditorStructureRequests} from './useEditorStructureRequests';
import {useLatestRef} from './useLatestRef';

type UseEditorLifecycleArgs = {
    editor: TiptapEditor | null,
    initialValue: ScriptDocument,
    initialSerialized: string,
    autoFocus?: boolean,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onValueChange?: (value: ScriptDocument) => void,
    setLatestValue: (value: ScriptDocument) => void,
    syncInitialValue: (value: ScriptDocument, initialSerialized: string) => void,
    scheduleAutosave: (value: ScriptDocument) => void,
    handleManualSave: () => Promise<void>,
    focusBlockRequest?: {
        blockId: string,
        requestId: number,
    } | null,
    insertActRequest?: {
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    renameActRequest?: {
        blockId: string,
        nextName: string,
        requestId: number,
    } | null,
    deleteActRequest?: {
        blockId: string,
        requestId: number,
    } | null,
    moveSceneRequest?: {
        sourceSceneBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    moveActRequest?: {
        sourceActBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    onActiveBlockChange?: (blockId: string | null) => void,
};

export const useEditorLifecycle = ({
    editor,
    initialValue,
    initialSerialized,
    autoFocus,
    onManualSave,
    onValueChange,
    setLatestValue,
    syncInitialValue,
    scheduleAutosave,
    handleManualSave,
    focusBlockRequest,
    insertActRequest,
    renameActRequest,
    deleteActRequest,
    moveSceneRequest,
    moveActRequest,
    onActiveBlockChange,
}: UseEditorLifecycleArgs) => {
    const pendingUpdateRef = useRef<number | null>(null);
    const latestEditorRef = useRef<TiptapEditor | null>(null);
    const isApplyingInitialRef = useRef(false);
    const onValueChangeRef = useLatestRef(onValueChange);

    useEditorStructureRequests({
        editor,
        focusBlockRequest,
        insertActRequest,
        renameActRequest,
        deleteActRequest,
        moveSceneRequest,
        moveActRequest,
        onActiveBlockChange,
        onValueChangeRef,
        setLatestValue,
        scheduleAutosave,
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        latestEditorRef.current = editor;

        const handleUpdate = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            if (isApplyingInitialRef.current) {
                return;
            }

            latestEditorRef.current = updatedEditor;

            if (pendingUpdateRef.current !== null) {
                return;
            }

            pendingUpdateRef.current = window.requestAnimationFrame(() => {
                pendingUpdateRef.current = null;

                const activeEditor = latestEditorRef.current;

                if (!activeEditor || isApplyingInitialRef.current) {
                    return;
                }

                const nextValue = stripScriptSettings(activeEditor.getJSON() as ScriptDocument);

                setLatestValue(nextValue);
                onValueChangeRef.current?.(nextValue);
                scheduleAutosave(nextValue);
            });
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (pendingUpdateRef.current !== null) {
                window.cancelAnimationFrame(pendingUpdateRef.current);
                pendingUpdateRef.current = null;
            }
        };
    }, [
        editor,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const normalizedStructure = normalizeScriptStructure(initialValue.attrs?.structure, {
            content: initialValue.content,
        });

        isApplyingInitialRef.current = true;
        editor.commands.setContent(initialValue, {emitUpdate: false});
        editor.view.dispatch(
            editor.state.tr
                .setDocAttribute('structure', normalizedStructure)
                .setDocAttribute('settings', initialValue.attrs?.settings ?? null)
                .setMeta('preventUpdate', true),
        );
        isApplyingInitialRef.current = false;

        syncInitialValue(initialValue, initialSerialized);
    }, [
        editor,
        initialSerialized,
        initialValue,
        syncInitialValue,
    ]);

    useEffect(() => {
        if (!editor || !autoFocus) {
            return;
        }

        editor.commands.focus('start');
    }, [autoFocus, editor]);

    useEffect(() => {
        if (!onManualSave) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void handleManualSave();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleManualSave, onManualSave]);

    useEffect(() => {
        return () => {
            if (pendingUpdateRef.current !== null) {
                window.cancelAnimationFrame(pendingUpdateRef.current);
                pendingUpdateRef.current = null;
            }
        };
    }, []);
};

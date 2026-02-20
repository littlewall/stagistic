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

import type {
    EditorStructureRequests,
    EditorValueChangeMeta,
} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {
    type AutosaveSchedulePayload,
    type SaveResult,
} from './useAutosaveController';
import {useEditorStructureRequests} from './useEditorStructureRequests';
import {useLatestRef} from './useLatestRef';

interface UseEditorLifecycleArgs {
    editor: {
        instance: TiptapEditor | null,
        autoFocus?: boolean,
    },
    document: {
        initialValue: ScriptDocument,
        initialSerialized: string,
        setLatestValue: (value: ScriptDocument, revision?: number) => void,
        syncInitialValue: (value: ScriptDocument, initialSerialized: string, revision?: number) => void,
        scheduleAutosave: (value?: ScriptDocument | AutosaveSchedulePayload) => void,
    },
    save: {
        onManualSave?: (value: ScriptDocument) => SaveResult,
        handleManualSave: () => Promise<void>,
    },
    callbacks: {
        onValueChange?: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
        onActiveBlockChange?: (blockId: string | null) => void,
    },
    requests?: EditorStructureRequests,
}

export const useEditorLifecycle = ({
    editor,
    document,
    save,
    callbacks,
    requests,
}: UseEditorLifecycleArgs) => {
    const {instance, autoFocus} = editor;
    const {
        initialValue,
        initialSerialized,
        setLatestValue,
        syncInitialValue,
        scheduleAutosave,
    } = document;
    const {
        onManualSave,
        handleManualSave,
    } = save;
    const {
        onValueChange,
        onActiveBlockChange,
    } = callbacks;
    const isApplyingInitialRef = useRef(false);
    const revisionRef = useRef(0);
    const onValueChangeRef = useLatestRef(onValueChange);

    useEditorStructureRequests({
        editor: instance,
        requests,
        onActiveBlockChange,
        onValueChangeRef,
        setLatestValue,
        scheduleAutosave,
        revisionRef,
    });

    useEffect(() => {
        if (!instance) {
            return;
        }

        const handleUpdate = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            if (isApplyingInitialRef.current) {
                return;
            }

            revisionRef.current += 1;

            const revision = revisionRef.current;
            const nextValue = stripScriptSettings(updatedEditor.getJSON() as ScriptDocument);

            scheduleAutosave({revision});
            setLatestValue(nextValue, revision);
            onValueChangeRef.current?.(nextValue, {
                source: 'typing',
                revision,
            });
        };

        instance.on('update', handleUpdate);

        return () => {
            instance.off('update', handleUpdate);
        };
    }, [
        instance,
        onValueChangeRef,
        scheduleAutosave,
        setLatestValue,
    ]);

    useEffect(() => {
        if (!instance) {
            return;
        }

        const normalizedStructure = normalizeScriptStructure(initialValue.attrs?.structure, {
            content: initialValue.content,
        });

        isApplyingInitialRef.current = true;
        instance.commands.setContent(initialValue, {emitUpdate: false});
        instance.view.dispatch(
            instance.state.tr
                .setDocAttribute('structure', normalizedStructure)
                .setDocAttribute('settings', initialValue.attrs?.settings ?? null)
                .setMeta('preventUpdate', true),
        );
        isApplyingInitialRef.current = false;
        revisionRef.current = 0;

        syncInitialValue(initialValue, initialSerialized, revisionRef.current);
    }, [
        instance,
        initialSerialized,
        initialValue,
        syncInitialValue,
    ]);

    useEffect(() => {
        if (!instance || !autoFocus) {
            return;
        }

        instance.commands.focus('start');
    }, [autoFocus, instance]);

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
};

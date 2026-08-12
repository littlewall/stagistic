import type {ScriptDocument} from '@stagistic/script';
import {useHotkey} from '@tanstack/react-hotkeys';
import {
    type Selection,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';
import {type Editor as TiptapEditor} from '@tiptap/react';
import {
    useEffect,
    useRef,
} from 'react';

import type {EditorActCommands} from '../actCommands/context';
import {useBuildActCommands} from '../actCommands/useBuildActCommands';
import type {EditorIndexSnapshot, EditorValueChangeMeta} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {incrementFullDocJsonSerializeCount, incrementFullIndexBuildCount} from '../perf/editorPerfMetrics';
import {buildIndexSnapshotFromPmDoc} from '../runtime/buildIndexSnapshotFromPmDoc';
import {IMMEDIATE_SAVE_META_KEY} from '../saveMeta';
import {
    sanitizeScriptBlocks,
    type UseEditorLifecycleArgs,
    useEditorLifecycleSync,
} from './editorLifecycleSync';
import {useEditorStructureRequests} from './useEditorStructureRequests';
import {useLatestRef} from './useLatestRef';

export type {UseEditorLifecycleArgs};

const getWindowTarget = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window;
};

const forcePaginationRecalc = (editor: TiptapEditor) => {
    type PaginationCommands = {forcePaginationRecalc?: () => boolean};
    (editor.commands as PaginationCommands).forcePaginationRecalc?.();
};

const resolveInitialSelection = (
    editor: TiptapEditor,
    placeAtSceneEnd = false,
): Selection => {
    let firstSceneStart: number | null = null;
    let firstSceneEnd: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (firstSceneEnd !== null) {
            return false;
        }

        if (node.type.name !== 'scene') {
            return true;
        }

        firstSceneStart = pos + 1;
        firstSceneEnd = pos + node.nodeSize - 1;

        return false;
    });

    if (firstSceneStart === null || firstSceneEnd === null) {
        return TextSelection.atStart(editor.state.doc);
    }

    const position = placeAtSceneEnd ? firstSceneEnd : firstSceneStart;

    return TextSelection.near(editor.state.doc.resolve(position), placeAtSceneEnd ? -1 : 1);
};

/*
 * Tracks which initial content each editor instance already applied. A cached
 * surface re-attached on a later mount must NOT re-apply the load-time initial
 * value — it would wipe newer live content and re-pay setContent + pagination.
 */
const appliedInitialByEditor = new WeakMap<TiptapEditor, string>();

export const useEditorLifecycle = ({
    editor,
    liveStore,
    document,
    save,
    callbacks,
    characters,
    requests,
}: UseEditorLifecycleArgs): {actCommands: EditorActCommands} => {
    const {instance, autoFocus} = editor;
    const {
        initialValue,
        initialSerialized,
        setLatestValue,
        syncInitialValue,
        scheduleAutosave,
    } = document;
    const {onManualSave, handleManualSave} = save;
    const isApplyingInitialRef = useRef(false);
    const revisionRef = useRef(0);
    const lastEmittedActiveBlockIdRef = useRef<string | null | undefined>(undefined);
    const onValueChangeRef = useLatestRef(callbacks.onValueChange);
    const onIndexChangeRef = useLatestRef(callbacks.onIndexChange);
    const onActiveBlockChangeRef = useLatestRef(callbacks.onActiveBlockChange);
    const onBlockUiEventRef = useLatestRef(callbacks.onBlockUiEvent);

    const {
        syncValueFromEditor,
        patchFallbackSnapshot,
        syncRuntimeSnapshotFromEditor,
        emitIndexFromEditor,
        emitBlockUiEventsFromEditor,
    } = useEditorLifecycleSync({
        liveStore,
        setLatestValue,
        characters,
        lastEmittedActiveBlockIdRef,
        onValueChangeRef,
        onIndexChangeRef,
        onActiveBlockChangeRef,
        onBlockUiEventRef,
    });

    const structureOnIndexChangeRef = useLatestRef((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => {
        if (!meta) {
            const resolvedMeta: EditorValueChangeMeta = {
                source: 'structure',
                revision: revisionRef.current,
            };

            if (!instance) {
                patchFallbackSnapshot(snapshot, resolvedMeta);

                return;
            }

            syncRuntimeSnapshotFromEditor(instance, snapshot);
            onIndexChangeRef.current?.(snapshot, resolvedMeta);

            return;
        }

        if (instance) {
            syncRuntimeSnapshotFromEditor(instance, snapshot);
            onIndexChangeRef.current?.(snapshot, meta);

            return;
        }

        patchFallbackSnapshot(snapshot, meta);
    });

    useEditorStructureRequests({
        editor: instance,
        requests,
        onValueChangeRef,
        onIndexChangeRef: structureOnIndexChangeRef,
        setLatestValue,
        scheduleAutosave,
        revisionRef,
    });

    const actCommands = useBuildActCommands({
        instance,
        onValueChangeRef,
        onIndexChangeRef: structureOnIndexChangeRef,
        setLatestValue,
        scheduleAutosave,
        revisionRef,
    });

    useEffect(() => {
        if (!instance) {
            return;
        }

        const handleUpdate = ({editor: updatedEditor, transaction}: {editor: TiptapEditor, transaction: Transaction}) => {
            if (isApplyingInitialRef.current) {
                return;
            }

            revisionRef.current += 1;

            const revision = revisionRef.current;
            const meta: EditorValueChangeMeta = {source: 'typing', revision};

            if (onIndexChangeRef.current) {
                emitIndexFromEditor(updatedEditor, meta);
            }

            /*
             * Keep ProseMirror as the live source of truth while typing.
             * Full document serialization is reserved for structural edits and save flows.
             * Discrete commands (e.g. block-type change) tag their transaction to
             * persist immediately; plain typing stays debounced.
             */
            const immediate = Boolean(transaction.getMeta(IMMEDIATE_SAVE_META_KEY));

            scheduleAutosave({revision, immediate});
        };

        instance.on('update', handleUpdate);

        return () => {
            instance.off('update', handleUpdate);
        };
    }, [
        emitIndexFromEditor,
        instance,
        onIndexChangeRef,
        scheduleAutosave,
    ]);

    useEffect(() => {
        if (!instance) {
            return;
        }

        const handleTransaction = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            emitBlockUiEventsFromEditor(updatedEditor);
            syncRuntimeSnapshotFromEditor(updatedEditor);
        };

        instance.on('transaction', handleTransaction);

        return () => {
            instance.off('transaction', handleTransaction);
        };
    }, [
        emitBlockUiEventsFromEditor,
        instance,
        syncRuntimeSnapshotFromEditor,
    ]);

    useEffect(() => {
        if (!instance) {
            return;
        }

        const isRestoredSurface = appliedInitialByEditor.get(instance) === initialSerialized;

        if (!isRestoredSurface) {
            isApplyingInitialRef.current = true;
            instance.chain()
                .setContent(initialValue, {emitUpdate: false})
                .command(({tr}) => {
                    tr.setMeta('addToHistory', false);

                    return true;
                })
                .run();
            sanitizeScriptBlocks(instance);

            const syncCommands = instance.commands as {syncCharacterRefs?: () => boolean};

            syncCommands.syncCharacterRefs?.();
            instance.view.dispatch(
                instance.state.tr
                    .setDocAttribute('settings', initialValue.attrs?.settings ?? null)
                    .setMeta('preventUpdate', true)
                    .setMeta('addToHistory', false),
            );
            isApplyingInitialRef.current = false;
            appliedInitialByEditor.set(instance, initialSerialized);
        }

        revisionRef.current = 0;
        lastEmittedActiveBlockIdRef.current = undefined;

        if (!isRestoredSurface) {
            instance.view.dispatch(
                instance.state.tr
                    .setSelection(resolveInitialSelection(instance, autoFocus))
                    .setMeta('preventUpdate', true)
                    .setMeta('addToHistory', false),
            );
        }

        incrementFullDocJsonSerializeCount();

        /*
         * A restored surface keeps its live content (potentially newer than the
         * load-time initial value) — the baseline and snapshot below are seeded
         * from the current document either way.
         */
        const syncedValue = stripScriptSettings(instance.getJSON() as ScriptDocument);

        syncInitialValue(syncedValue, initialSerialized, revisionRef.current);

        if (!onIndexChangeRef.current) {
            syncRuntimeSnapshotFromEditor(instance);

            return;
        }

        incrementFullIndexBuildCount();

        const snapshot = buildIndexSnapshotFromPmDoc(instance.state.doc);

        syncRuntimeSnapshotFromEditor(instance, snapshot);
        onIndexChangeRef.current?.(snapshot, {
            source: 'structure',
            revision: revisionRef.current,
        });
    }, [
        autoFocus,
        instance,
        initialSerialized,
        initialValue,
        onIndexChangeRef,
        syncRuntimeSnapshotFromEditor,
        syncInitialValue,
    ]);

    useEffect(() => {
        if (!instance) {
            return;
        }

        const handleBlur = ({editor: blurredEditor}: {editor: TiptapEditor}) => {
            forcePaginationRecalc(blurredEditor);
        };

        instance.on('blur', handleBlur);

        return () => {
            instance.off('blur', handleBlur);
        };
    }, [instance]);

    useEffect(() => {
        if (!instance || !autoFocus) {
            return;
        }

        instance.commands.focus(resolveInitialSelection(instance, true).from);
    }, [autoFocus, instance]);

    useHotkey('Mod+S', () => {
        if (!instance || !onManualSave) {
            return;
        }

        forcePaginationRecalc(instance);
        syncValueFromEditor(instance, {
            source: 'typing',
            revision: revisionRef.current,
        });
        void handleManualSave();
    }, {
        enabled: Boolean(instance && onManualSave),
        target: getWindowTarget(),
    });

    return {actCommands};
};

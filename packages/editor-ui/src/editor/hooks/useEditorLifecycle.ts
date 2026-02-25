import {
    buildScriptBlockIndex,
    normalizeScriptStructure,
    type ScriptDocument,
} from '@stagistic/script-core';
import {useHotkey} from '@tanstack/react-hotkeys';
import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

import type {
    EditorBlockUiEvent,
    EditorIndexSnapshot,
    EditorLiveSnapshot,
    EditorStructureRequests,
    EditorValueChangeMeta,
} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {buildCharacterSnapshotFromDoc} from '../live/buildCharacterSnapshotFromDoc';
import {buildSidebarProjectionFromIndex} from '../live/buildSidebarProjectionFromIndex';
import type {EditorSnapshotStore} from '../live/store';
import {trackIndexUpdateDuration} from '../perf/editorPerfMetrics';
import {
    getBlockUiEventsFromState,
} from '../tiptap/extensions';
import {
    ensureFountainBlockId,
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';
import {
    type AutosaveSchedulePayload,
    type SaveResult,
} from './useAutosaveController';
import {useEditorStructureRequests} from './useEditorStructureRequests';
import {useLatestRef} from './useLatestRef';

const TYPING_VALUE_SYNC_DELAY_MS = 400;
const getNow = () => {
    if (typeof performance !== 'undefined') {
        return performance.now();
    }

    return Date.now();
};

const getWindowTarget = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window;
};

type PaginationCommands = {
    forcePaginationRecalc?: () => boolean,
};

const sanitizeFountainBlocks = (editor: TiptapEditor) => {
    let tr = editor.state.tr;
    let changed = false;
    const seenIds = new Set<string>();

    editor.state.doc.descendants((node, pos) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        const attrs = node.attrs as Record<string, unknown>;
        let id = ensureFountainBlockId(attrs.id);
        const blockType = normalizeFountainBlockType(attrs.blockType);

        while (seenIds.has(id)) {
            id = ensureFountainBlockId(null);
        }

        seenIds.add(id);

        if (id === attrs.id && blockType === attrs.blockType) {
            return false;
        }

        tr = tr.setNodeMarkup(pos, undefined, {
            ...attrs,
            id,
            blockType,
        });
        changed = true;

        return false;
    });

    if (!changed) {
        return;
    }

    editor.view.dispatch(tr.setMeta('preventUpdate', true));
};

const forcePaginationRecalc = (editor: TiptapEditor) => {
    const commands = editor.commands as PaginationCommands;

    commands.forcePaginationRecalc?.();
};

const resolveSidebarProjection = (snapshot: EditorIndexSnapshot) => {
    return {
        projection: buildSidebarProjectionFromIndex(snapshot),
        change: {
            structureChanged: true,
            charactersChanged: true,
            reason: 'fallback' as const,
        },
    };
};

interface UseEditorLifecycleArgs {
    editor: {
        instance: TiptapEditor | null,
        autoFocus?: boolean,
    },
    liveStore: EditorSnapshotStore,
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
        onIndexChange?: (snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void,
        onActiveBlockChange?: (blockId: string | null) => void,
        onBlockUiEvent?: (event: EditorBlockUiEvent) => void,
    },
    requests?: EditorStructureRequests,
}

export const useEditorLifecycle = ({
    editor,
    liveStore,
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
        onIndexChange,
        onActiveBlockChange,
        onBlockUiEvent,
    } = callbacks;
    const isApplyingInitialRef = useRef(false);
    const revisionRef = useRef(0);
    const pendingValueSyncTimerRef = useRef<number | null>(null);
    const onValueChangeRef = useLatestRef(onValueChange);
    const onIndexChangeRef = useLatestRef(onIndexChange);
    const onBlockUiEventRef = useLatestRef(onBlockUiEvent);

    const clearPendingValueSync = useCallback(() => {
        if (pendingValueSyncTimerRef.current === null) {
            return;
        }

        window.clearTimeout(pendingValueSyncTimerRef.current);
        pendingValueSyncTimerRef.current = null;
    }, []);

    const syncValueFromEditor = useCallback((
        targetEditor: TiptapEditor,
        meta: EditorValueChangeMeta,
    ) => {
        const nextValue = stripScriptSettings(targetEditor.getJSON() as ScriptDocument);

        setLatestValue(nextValue, meta.revision);
        onValueChangeRef.current?.(nextValue, meta);
    }, [onValueChangeRef, setLatestValue]);

    const emitIndexSnapshot = useCallback((
        snapshot: EditorIndexSnapshot,
        meta: EditorValueChangeMeta,
        targetEditor?: TiptapEditor,
    ) => {
        const hasIndexSubscriber = Boolean(onIndexChangeRef.current);
        const {projection, change} = resolveSidebarProjection(snapshot);
        const activeBlockId = targetEditor
            ? getActiveFountainBlockFromState(targetEditor.state, FOUNTAIN_BLOCK_NODE_NAME)?.id ?? null
            : liveStore.getSnapshot().activeBlockId;
        const patch: Partial<EditorLiveSnapshot> = {
            revision: meta.revision,
            activeBlockId,
        };

        if (hasIndexSubscriber) {
            patch.index = snapshot;
        }

        if (meta.source === 'structure' || change.structureChanged) {
            patch.structure = projection.structure;
        }

        if (targetEditor) {
            patch.characters = buildCharacterSnapshotFromDoc(targetEditor.state.doc);
        }

        liveStore.patchSnapshot(patch);

        if (hasIndexSubscriber) {
            onIndexChangeRef.current?.(snapshot, meta);
        }
    }, [liveStore, onIndexChangeRef]);
    const emitIndexFromEditor = useCallback((
        targetEditor: TiptapEditor,
        meta: EditorValueChangeMeta,
    ) => {
        const startedAt = getNow();
        const snapshot = buildScriptBlockIndex(targetEditor.getJSON() as ScriptDocument).snapshot;

        emitIndexSnapshot(snapshot, meta, targetEditor);
        trackIndexUpdateDuration(getNow() - startedAt);
    }, [emitIndexSnapshot]);

    const emitBlockUiEventsFromEditor = useCallback((targetEditor: TiptapEditor) => {
        const events = getBlockUiEventsFromState(targetEditor.state);

        if (events.length === 0) {
            return;
        }

        events.forEach(event => {
            onBlockUiEventRef.current?.(event);
        });
    }, [onBlockUiEventRef]);
    const structureOnIndexChangeRef = useLatestRef((snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => {
        if (!meta) {
            emitIndexSnapshot(snapshot, {
                source: 'structure',
                revision: revisionRef.current,
            }, instance ?? undefined);

            return;
        }

        emitIndexSnapshot(snapshot, meta, instance ?? undefined);
    });

    useEditorStructureRequests({
        editor: instance,
        requests,
        onActiveBlockChange,
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

        const handleUpdate = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            if (isApplyingInitialRef.current) {
                return;
            }

            revisionRef.current += 1;

            const revision = revisionRef.current;
            const meta: EditorValueChangeMeta = {
                source: 'typing',
                revision,
            };

            emitIndexFromEditor(updatedEditor, meta);
            scheduleAutosave({revision});

            clearPendingValueSync();
            pendingValueSyncTimerRef.current = window.setTimeout(() => {
                pendingValueSyncTimerRef.current = null;

                syncValueFromEditor(updatedEditor, {
                    source: 'typing',
                    revision: revisionRef.current,
                });
            }, TYPING_VALUE_SYNC_DELAY_MS);
        };

        instance.on('update', handleUpdate);

        return () => {
            instance.off('update', handleUpdate);
        };
    }, [
        clearPendingValueSync,
        emitIndexFromEditor,
        instance,
        scheduleAutosave,
        syncValueFromEditor,
    ]);

    useEffect(() => {
        if (!instance) {
            return;
        }

        const handleTransaction = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            emitBlockUiEventsFromEditor(updatedEditor);
            liveStore.patchSnapshot({
                activeBlockId: getActiveFountainBlockFromState(
                    updatedEditor.state,
                    FOUNTAIN_BLOCK_NODE_NAME,
                )?.id ?? null,
            });
        };

        instance.on('transaction', handleTransaction);

        return () => {
            instance.off('transaction', handleTransaction);
        };
    }, [
        emitBlockUiEventsFromEditor,
        instance,
        liveStore,
    ]);

    useEffect(() => {
        if (!instance) {
            return;
        }

        clearPendingValueSync();

        const normalizedStructure = normalizeScriptStructure(initialValue.attrs?.structure, {
            content: initialValue.content,
        });

        isApplyingInitialRef.current = true;
        instance.commands.setContent(initialValue, {emitUpdate: false});
        sanitizeFountainBlocks(instance);
        instance.view.dispatch(
            instance.state.tr
                .setDocAttribute('structure', normalizedStructure)
                .setDocAttribute('settings', initialValue.attrs?.settings ?? null)
                .setMeta('preventUpdate', true),
        );
        isApplyingInitialRef.current = false;
        revisionRef.current = 0;

        const syncedValue = stripScriptSettings(instance.getJSON() as ScriptDocument);

        syncInitialValue(syncedValue, initialSerialized, revisionRef.current);
        emitIndexFromEditor(instance, {
            source: 'structure',
            revision: revisionRef.current,
        });
    }, [
        clearPendingValueSync,
        emitIndexFromEditor,
        instance,
        initialSerialized,
        initialValue,
        syncInitialValue,
    ]);

    useEffect(() => {
        return () => {
            clearPendingValueSync();
        };
    }, [clearPendingValueSync]);

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

        instance.commands.focus('start');
    }, [autoFocus, instance]);

    useHotkey('Mod+S', () => {
        if (!instance || !onManualSave) {
            return;
        }

        clearPendingValueSync();
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
};

import {
    normalizeScriptStructure,
    type ScriptDocument,
} from '@stagistic/script';
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
    PersistentCharacterRef,
} from '../contracts';
import {stripScriptSettings} from '../editorSettings';
import {
    buildSidebarProjectionFromIndex,
    type SidebarProjectionColorContext,
} from '../live/buildSidebarProjectionFromIndex';
import type {EditorSnapshotStore} from '../live/store';
import {
    incrementFullDocJsonSerializeCount,
    incrementFullIndexBuildCount,
    incrementTransactionBridgePatchCount,
    trackIndexUpdateDuration,
} from '../perf/editorPerfMetrics';
import {buildIndexSnapshotFromPmDoc} from '../runtime/buildIndexSnapshotFromPmDoc';
import {
    getBlockUiEventsFromState,
    getEditorRuntimeFromState,
} from '../tiptap/extensions';
import {
    ensureFountainBlockId,
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';
import {
    type AutosaveSchedulePayload,
    type SaveResult,
} from './useAutosaveController';
import {useEditorStructureRequests} from './useEditorStructureRequests';
import {useLatestRef} from './useLatestRef';

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

const resolveSidebarProjection = (
    snapshot: EditorIndexSnapshot,
    colorContext?: SidebarProjectionColorContext,
) => {
    return {
        projection: buildSidebarProjectionFromIndex(snapshot, colorContext),
        change: {
            structureChanged: true,
            charactersChanged: true,
            reason: 'fallback' as const,
        },
    };
};

const hasStructureRows = (snapshot: EditorLiveSnapshot['structure']) => {
    return snapshot.rows.length > 0 || snapshot.sceneByBlockId.size > 0;
};

const hasCharacterRows = (snapshot: EditorLiveSnapshot['characters']) => {
    return snapshot.countsByKey.size > 0
        || snapshot.countsByCharacterId.size > 0
        || snapshot.keyByCharacterId.size > 0;
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
    characters?: {
        persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
        colorByCharacterIdRef?: {current: ReadonlyMap<string, string>},
        rememberedColorByKeyRef?: {current: ReadonlyMap<string, string>},
        characterColorSaturation?: number,
    },
    requests?: EditorStructureRequests,
}

export const useEditorLifecycle = ({
    editor,
    liveStore,
    document,
    save,
    callbacks,
    characters,
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
    const lastEmittedActiveBlockIdRef = useRef<string | null | undefined>(undefined);
    const onValueChangeRef = useLatestRef(onValueChange);
    const onIndexChangeRef = useLatestRef(onIndexChange);
    const onActiveBlockChangeRef = useLatestRef(onActiveBlockChange);
    const onBlockUiEventRef = useLatestRef(onBlockUiEvent);

    const syncValueFromEditor = useCallback((
        targetEditor: TiptapEditor,
        meta: EditorValueChangeMeta,
    ) => {
        incrementFullDocJsonSerializeCount();

        const nextValue = stripScriptSettings(targetEditor.getJSON() as ScriptDocument);

        setLatestValue(nextValue, meta.revision);
        onValueChangeRef.current?.(nextValue, meta);
    }, [onValueChangeRef, setLatestValue]);

    const patchFallbackSnapshot = useCallback((
        snapshot: EditorIndexSnapshot,
        meta: EditorValueChangeMeta,
    ) => {
        const hasIndexSubscriber = Boolean(onIndexChangeRef.current);
        const {projection, change} = resolveSidebarProjection(snapshot, {
            characterColorSaturation: characters?.characterColorSaturation,
            colorByCharacterId: characters?.colorByCharacterIdRef?.current,
            rememberedColorByKey: characters?.rememberedColorByKeyRef?.current,
            persistentCharacters: characters?.persistentCharactersRef?.current,
        });
        const patch: Partial<EditorLiveSnapshot> = {
            revision: meta.revision,
            activeBlockId: liveStore.getSnapshot().activeBlockId,
            activeBlockType: liveStore.getSnapshot().activeBlockType,
        };

        if (hasIndexSubscriber) {
            patch.index = snapshot;
        }

        if (meta.source === 'structure' || change.structureChanged) {
            patch.structure = projection.structure;
        }

        if (meta.source === 'structure' || change.charactersChanged) {
            patch.characters = projection.characters;
        }

        liveStore.patchSnapshot(patch);

        if (hasIndexSubscriber) {
            onIndexChangeRef.current?.(snapshot, meta);
        }
    }, [
        characters?.characterColorSaturation,
        characters?.colorByCharacterIdRef,
        characters?.rememberedColorByKeyRef,
        characters?.persistentCharactersRef,
        liveStore,
        onIndexChangeRef,
    ]);
    const syncRuntimeSnapshotFromEditor = useCallback((
        targetEditor: TiptapEditor,
        snapshot?: EditorIndexSnapshot,
    ) => {
        const runtime = getEditorRuntimeFromState(targetEditor.state);

        if (!runtime) {
            return;
        }

        const currentSnapshot = liveStore.getSnapshot();
        const fallbackProjection = snapshot
            ? buildSidebarProjectionFromIndex(snapshot, {
                characterColorSaturation: characters?.characterColorSaturation,
                colorByCharacterId: characters?.colorByCharacterIdRef?.current,
                rememberedColorByKey: characters?.rememberedColorByKeyRef?.current,
                persistentCharacters: characters?.persistentCharactersRef?.current,
            })
            : null;
        const nextStructure = hasStructureRows(runtime.structure)
            ? runtime.structure
            : fallbackProjection?.structure ?? currentSnapshot.structure;
        const nextCharacters = hasCharacterRows(runtime.characters)
            ? runtime.characters
            : fallbackProjection?.characters ?? currentSnapshot.characters;

        incrementTransactionBridgePatchCount();
        liveStore.patchSnapshot({
            revision: runtime.revision,
            activeBlockId: runtime.activeBlockId,
            activeBlockType: runtime.activeBlockType,
            structure: nextStructure,
            characters: nextCharacters,
            ...snapshot ? {index: snapshot} : {},
        });

        if (lastEmittedActiveBlockIdRef.current !== runtime.activeBlockId) {
            lastEmittedActiveBlockIdRef.current = runtime.activeBlockId;
            onActiveBlockChangeRef.current?.(runtime.activeBlockId);
        }
    }, [
        characters?.characterColorSaturation,
        characters?.colorByCharacterIdRef,
        characters?.persistentCharactersRef,
        characters?.rememberedColorByKeyRef,
        liveStore,
        onActiveBlockChangeRef,
    ]);
    const emitIndexFromEditor = useCallback((
        targetEditor: TiptapEditor,
        meta: EditorValueChangeMeta,
    ) => {
        if (!onIndexChangeRef.current) {
            return;
        }

        const startedAt = getNow();

        incrementFullIndexBuildCount();

        const snapshot = buildIndexSnapshotFromPmDoc(targetEditor.state.doc);

        syncRuntimeSnapshotFromEditor(targetEditor, snapshot);
        onIndexChangeRef.current?.(snapshot, meta);
        trackIndexUpdateDuration(getNow() - startedAt);
    }, [onIndexChangeRef, syncRuntimeSnapshotFromEditor]);

    const emitBlockUiEventsFromEditor = useCallback((targetEditor: TiptapEditor) => {
        if (!onBlockUiEventRef.current) {
            return;
        }

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

            if (onIndexChangeRef.current) {
                emitIndexFromEditor(updatedEditor, meta);
            }

            /*
             * Keep ProseMirror as the live source of truth while typing.
             * Full document serialization is reserved for structural edits and save flows.
             */
            scheduleAutosave({revision});
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

        const normalizedStructure = normalizeScriptStructure(initialValue.attrs?.structure, {
            content: initialValue.content,
        });

        isApplyingInitialRef.current = true;
        instance.commands.setContent(initialValue, {emitUpdate: false});
        sanitizeFountainBlocks(instance);

        const syncCommands = instance.commands as {
            syncCharacterRefs?: () => boolean,
        };

        syncCommands.syncCharacterRefs?.();
        instance.view.dispatch(
            instance.state.tr
                .setDocAttribute('structure', normalizedStructure)
                .setDocAttribute('settings', initialValue.attrs?.settings ?? null)
                .setMeta('preventUpdate', true),
        );
        isApplyingInitialRef.current = false;
        revisionRef.current = 0;
        lastEmittedActiveBlockIdRef.current = undefined;

        incrementFullDocJsonSerializeCount();

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

        instance.commands.focus('start');
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
};

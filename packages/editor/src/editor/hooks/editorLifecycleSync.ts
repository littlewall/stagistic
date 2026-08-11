import type {ScriptDocument} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useCallback} from 'react';

import type {
    EditorIndexSnapshot,
    EditorLiveSnapshot,
    EditorValueChangeMeta,
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
import {getBlockUiEventsFromState, getEditorRuntimeFromState} from '../tiptap/extensions';
import {
    ensureScriptBlockId,
    isScriptBlockNodeName,
    normalizeBlockNodeType,
} from '../tiptap/scriptCore';
import type {UseEditorLifecycleArgs} from './editorLifecycleTypes';
import type {useLatestRef} from './useLatestRef';

export type {UseEditorLifecycleArgs};

export const sanitizeScriptBlocks = (editor: TiptapEditor) => {
    let tr = editor.state.tr;
    let changed = false;
    const seenIds = new Set<string>();

    editor.state.doc.descendants((node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        const attrs = node.attrs as Record<string, unknown>;
        let id = ensureScriptBlockId(attrs.id);
        const blockType = normalizeBlockNodeType(attrs.blockType);

        while (seenIds.has(id)) {
            id = ensureScriptBlockId(null);
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

    editor.view.dispatch(tr.setMeta('preventUpdate', true).setMeta('addToHistory', false));
};

const getNow = () => {
    if (typeof performance !== 'undefined') {
        return performance.now();
    }

    return Date.now();
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

type LatestRef<T> = ReturnType<typeof useLatestRef<T>>;

interface UseEditorLifecycleSyncArgs {
    liveStore: EditorSnapshotStore,
    setLatestValue: UseEditorLifecycleArgs['document']['setLatestValue'],
    characters: UseEditorLifecycleArgs['characters'],
    lastEmittedActiveBlockIdRef: {current: string | null | undefined},
    onValueChangeRef: LatestRef<UseEditorLifecycleArgs['callbacks']['onValueChange']>,
    onIndexChangeRef: LatestRef<UseEditorLifecycleArgs['callbacks']['onIndexChange']>,
    onActiveBlockChangeRef: LatestRef<UseEditorLifecycleArgs['callbacks']['onActiveBlockChange']>,
    onBlockUiEventRef: LatestRef<UseEditorLifecycleArgs['callbacks']['onBlockUiEvent']>,
}

export interface EditorLifecycleSyncCallbacks {
    syncValueFromEditor: (targetEditor: TiptapEditor, meta: EditorValueChangeMeta) => void,
    patchFallbackSnapshot: (snapshot: EditorIndexSnapshot, meta: EditorValueChangeMeta) => void,
    syncRuntimeSnapshotFromEditor: (targetEditor: TiptapEditor, snapshot?: EditorIndexSnapshot) => void,
    emitIndexFromEditor: (targetEditor: TiptapEditor, meta: EditorValueChangeMeta) => void,
    emitBlockUiEventsFromEditor: (targetEditor: TiptapEditor) => void,
}

/*
 * Sync strategy for live store updates:
 *   1. During typing: ProseMirror runtime extension bridges each transaction → fast path,
 *      no full doc serialization. syncRuntimeSnapshotFromEditor reads runtime state directly.
 *   2. After structural commands (act/scene mutations, reorder): extractScriptBlocks runs
 *      a full index build and feeds it as fallback projection via patchFallbackSnapshot.
 *      This covers the gap between the transaction and the next runtime cycle.
 *   3. On initial load: full index build + syncRuntimeSnapshotFromEditor with the snapshot
 *      so the sidebar is populated before the first keystroke.
 */
export const useEditorLifecycleSync = ({
    liveStore,
    setLatestValue,
    characters,
    lastEmittedActiveBlockIdRef,
    onValueChangeRef,
    onIndexChangeRef,
    onActiveBlockChangeRef,
    onBlockUiEventRef,
}: UseEditorLifecycleSyncArgs): EditorLifecycleSyncCallbacks => {
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
            music: snapshot.music,
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
            music: runtime.music,
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
        lastEmittedActiveBlockIdRef,
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

    return {
        syncValueFromEditor,
        patchFallbackSnapshot,
        syncRuntimeSnapshotFromEditor,
        emitIndexFromEditor,
        emitBlockUiEventsFromEditor,
    };
};

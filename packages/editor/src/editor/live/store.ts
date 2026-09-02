import type {
    EditorIndexSnapshot,
    EditorLiveCharacterSnapshot,
    EditorLiveScenePlacementSnapshot,
    EditorLiveSnapshot,
    EditorLiveStructureSnapshot,
} from '../contracts';
import {incrementSidebarStorePatchCount} from '../perf/editorPerfMetrics';

type Listener = () => void;

type SelectorListener<TSelected> = {
    selector: (snapshot: EditorLiveSnapshot) => TSelected,
    isEqual: (previous: TSelected, next: TSelected) => boolean,
    selected: TSelected,
    listener: Listener,
};

const EMPTY_INDEX: EditorIndexSnapshot = {
    blocks: [],
    music: [],
    orphanMusicOutBlockIds: [],
};

export const EMPTY_STRUCTURE: EditorLiveStructureSnapshot = {
    rows: [],
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
    actByBlockId: new Map<string, string>(),
};

export const EMPTY_SCENE_PLACEMENT: EditorLiveScenePlacementSnapshot = {
    byBlockId: new Map<string, never>(),
    hasComputed: false,
};

export const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
    keyByCharacterId: new Map<string, string>(),
    displayColorByKey: new Map<string, string>(),
};

export const createEmptyEditorLiveSnapshot = (): EditorLiveSnapshot => {
    return {
        revision: 0,
        index: EMPTY_INDEX,
        structure: EMPTY_STRUCTURE,
        scenePlacement: EMPTY_SCENE_PLACEMENT,
        characters: EMPTY_CHARACTERS,
        music: [],
        activeBlockId: null,
        activeBlockType: null,
    };
};

export interface EditorSnapshotStore {
    getSnapshot: () => EditorLiveSnapshot,
    setSnapshot: (nextSnapshot: EditorLiveSnapshot) => void,
    patchSnapshot: (patch: Partial<EditorLiveSnapshot>) => void,
    subscribe: (listener: Listener) => () => void,
    subscribeSelector: <TSelected>(
        selector: (snapshot: EditorLiveSnapshot) => TSelected,
        isEqual: (previous: TSelected, next: TSelected) => boolean,
        listener: Listener,
    ) => () => void,
}

const notifySelectors = (
    selectorListeners: Set<SelectorListener<unknown>>,
    snapshot: EditorLiveSnapshot,
) => {
    selectorListeners.forEach(selectorListener => {
        const nextSelected = selectorListener.selector(snapshot);

        if (selectorListener.isEqual(selectorListener.selected, nextSelected)) {
            return;
        }

        selectorListener.selected = nextSelected;
        selectorListener.listener();
    });
};

export const createEditorSnapshotStore = (initialSnapshot?: EditorLiveSnapshot): EditorSnapshotStore => {
    let snapshot = initialSnapshot ?? createEmptyEditorLiveSnapshot();
    const listeners = new Set<Listener>();
    const selectorListeners = new Set<SelectorListener<unknown>>();

    const emit = () => {
        listeners.forEach(listener => listener());
        notifySelectors(selectorListeners, snapshot);
    };

    const setSnapshot = (nextSnapshot: EditorLiveSnapshot) => {
        if (Object.is(snapshot, nextSnapshot)) {
            return;
        }

        snapshot = nextSnapshot;
        incrementSidebarStorePatchCount();
        emit();
    };

    const patchSnapshot = (patch: Partial<EditorLiveSnapshot>) => {
        if (Object.keys(patch).length === 0) {
            return;
        }

        const nextSnapshot: EditorLiveSnapshot = {
            ...snapshot,
            ...patch,
        };
        const didChange =
            !Object.is(snapshot.revision, nextSnapshot.revision)
            || !Object.is(snapshot.index, nextSnapshot.index)
            || !Object.is(snapshot.structure, nextSnapshot.structure)
            || !Object.is(snapshot.scenePlacement, nextSnapshot.scenePlacement)
            || !Object.is(snapshot.characters, nextSnapshot.characters)
            || !Object.is(snapshot.music, nextSnapshot.music)
            || !Object.is(snapshot.activeBlockId, nextSnapshot.activeBlockId)
            || !Object.is(snapshot.activeBlockType, nextSnapshot.activeBlockType);

        if (!didChange) {
            return;
        }

        snapshot = nextSnapshot;
        incrementSidebarStorePatchCount();
        emit();
    };

    const subscribe = (listener: Listener) => {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    };

    const subscribeSelector = <TSelected>(
        selector: (currentSnapshot: EditorLiveSnapshot) => TSelected,
        isEqual: (previous: TSelected, next: TSelected) => boolean,
        listener: Listener,
    ) => {
        const selectorListener: SelectorListener<TSelected> = {
            selector,
            isEqual,
            selected: selector(snapshot),
            listener,
        };

        selectorListeners.add(selectorListener as SelectorListener<unknown>);

        return () => {
            selectorListeners.delete(selectorListener as SelectorListener<unknown>);
        };
    };

    return {
        getSnapshot: () => snapshot,
        setSnapshot,
        patchSnapshot,
        subscribe,
        subscribeSelector,
    };
};

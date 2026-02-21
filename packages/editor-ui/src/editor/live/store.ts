import type {
    EditorIndexSnapshot,
    EditorLiveCharacterSnapshot,
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
};

const EMPTY_STRUCTURE: EditorLiveStructureSnapshot = {
    rows: [],
    rowIndexByBlockId: new Map<string, number>(),
    sceneByBlockId: new Map<string, string>(),
};

const EMPTY_CHARACTERS: EditorLiveCharacterSnapshot = {
    countsByKey: new Map<string, number>(),
    countsByCharacterId: new Map<string, number>(),
};

export const createEmptyEditorLiveSnapshot = (): EditorLiveSnapshot => {
    return {
        revision: 0,
        index: EMPTY_INDEX,
        structure: EMPTY_STRUCTURE,
        characters: EMPTY_CHARACTERS,
        activeBlockId: null,
    };
};

export interface EditorLiveStore {
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

export const createEditorLiveStore = (initialSnapshot?: EditorLiveSnapshot): EditorLiveStore => {
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
        const didChange = (
            !Object.is(snapshot.revision, nextSnapshot.revision)
            || !Object.is(snapshot.index, nextSnapshot.index)
            || !Object.is(snapshot.structure, nextSnapshot.structure)
            || !Object.is(snapshot.characters, nextSnapshot.characters)
            || !Object.is(snapshot.activeBlockId, nextSnapshot.activeBlockId)
        );

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

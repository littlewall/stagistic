import {
    useCallback,
    useRef,
    useSyncExternalStore,
} from 'react';

import type {
    EditorLiveActiveBlockInfo,
    EditorLiveCharacterSnapshot,
    EditorLiveSnapshot,
    EditorLiveStructureSnapshot,
} from '../contracts';
import {trackSidebarSelectorDuration} from '../perf/editorPerfMetrics';
import {useEditorSnapshotStore} from './context';

const identity = <TValue>(value: TValue) => value;

const defaultIsEqual = <TValue>(previous: TValue, next: TValue) => Object.is(previous, next);
const getNow = () => {
    if (typeof performance !== 'undefined') {
        return performance.now();
    }

    return Date.now();
};

const useLatestValue = <TValue>(value: TValue) => {
    const ref = useRef(value);

    ref.current = value;

    return ref;
};

export const useEditorLiveSelector = <TSelected>(
    selector: (snapshot: EditorLiveSnapshot) => TSelected,
    isEqual: (previous: TSelected, next: TSelected) => boolean = defaultIsEqual,
) => {
    const store = useEditorSnapshotStore();
    const selectorRef = useLatestValue(selector);
    const isEqualRef = useLatestValue(isEqual);
    const selectedRef = useRef<TSelected>(selector(store.getSnapshot()));

    const maybeSyncSelected = useCallback(() => {
        const startedAt = getNow();
        const nextSelected = selectorRef.current(store.getSnapshot());

        if (isEqualRef.current(selectedRef.current, nextSelected)) {
            trackSidebarSelectorDuration(getNow() - startedAt);

            return;
        }

        selectedRef.current = nextSelected;
        trackSidebarSelectorDuration(getNow() - startedAt);
    }, [
        isEqualRef,
        selectorRef,
        store,
    ]);

    maybeSyncSelected();

    const subscribe = useCallback((notify: () => void) => {
        return store.subscribeSelector(
            snapshot => selectorRef.current(snapshot),
            (previous, next) => isEqualRef.current(previous, next),
            () => {
                maybeSyncSelected();
                notify();
            },
        );
    }, [
        isEqualRef,
        maybeSyncSelected,
        selectorRef,
        store,
    ]);
    const getSnapshot = useCallback(() => selectedRef.current, []);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export const useEditorLiveSnapshot = () => {
    return useEditorLiveSelector(identity);
};

export const useEditorLiveStructure = () => {
    return useEditorLiveSelector<EditorLiveStructureSnapshot>(snapshot => snapshot.structure);
};

export const useEditorLiveCharacters = () => {
    return useEditorLiveSelector<EditorLiveCharacterSnapshot>(snapshot => snapshot.characters);
};

export const useEditorLiveActiveBlock = () => {
    return useEditorLiveSelector<string | null>(snapshot => snapshot.activeBlockId);
};

export const useEditorLiveActiveBlockInfo = () => {
    return useEditorLiveSelector<EditorLiveActiveBlockInfo>(snapshot => ({
        id: snapshot.activeBlockId,
        type: snapshot.activeBlockType,
    }), (previous, next) => {
        return previous.id === next.id && previous.type === next.type;
    });
};

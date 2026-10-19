import {useSyncExternalStoreWithSelector} from 'use-sync-external-store/with-selector';

import type {
    EditorLiveActiveBlockInfo,
    EditorLiveCharacterSnapshot,
    EditorLiveMusicSnapshot,
    EditorLiveScenePlacementSnapshot,
    EditorLiveSnapshot,
    EditorLiveStructureSnapshot,
} from '../contracts';
import {useEditorSnapshotStore} from './context';

const identity = <TValue>(value: TValue) => value;

const defaultIsEqual = <TValue>(previous: TValue, next: TValue) => Object.is(previous, next);

export const useEditorLiveSelector = <TSelected>(
    selector: (snapshot: EditorLiveSnapshot) => TSelected,
    isEqual: (previous: TSelected, next: TSelected) => boolean = defaultIsEqual,
) => {
    const store = useEditorSnapshotStore();

    return useSyncExternalStoreWithSelector(
        store.subscribe,
        store.getSnapshot,
        store.getSnapshot,
        selector,
        isEqual,
    );
};

export const useEditorLiveSnapshot = () => {
    return useEditorLiveSelector(identity);
};

export const useEditorLiveStructure = () => {
    return useEditorLiveSelector<EditorLiveStructureSnapshot>(snapshot => snapshot.structure);
};

export const useEditorLiveScenePlacement = () => {
    return useEditorLiveSelector<EditorLiveScenePlacementSnapshot>(snapshot => snapshot.scenePlacement);
};

export const useEditorLiveCharacters = () => {
    return useEditorLiveSelector<EditorLiveCharacterSnapshot>(snapshot => snapshot.characters);
};

export const useEditorLiveMusic = () => {
    return useEditorLiveSelector<EditorLiveMusicSnapshot>(snapshot => snapshot.music);
};

export const useEditorLiveActiveBlock = () => {
    return useEditorLiveSelector<string | null>(snapshot => snapshot.activeBlockId);
};

export const useEditorLiveActiveBlockInfo = () => {
    return useEditorLiveSelector<EditorLiveActiveBlockInfo>(
        snapshot => ({
            id: snapshot.activeBlockId,
            type: snapshot.activeBlockType,
        }),
        (previous, next) => {
            return previous.id === next.id && previous.type === next.type;
        },
    );
};

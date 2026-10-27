import {
    EMPTY_EDITOR_INDEX,
    useEditorLiveCharacters,
    useEditorLiveScenePlacement,
    useEditorLiveSelector,
} from '@stagistic/editor';
import {buildScriptBlockIndex, type ScriptBlockIndexSnapshot} from '@stagistic/script';
import {useCallback, useMemo} from 'react';

import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';

export interface SceneBoardSource {
    index: ScriptBlockIndexSnapshot,
    /** Start page of a scene heading; null until the editor has measured pagination. */
    getStartPage: (headingBlockId: string) => number | null,
    /** Colors the editor assigned to characters that have none of their own. */
    displayColorByKey: ReadonlyMap<string, string>,
}

/*
 * The index comes from the live snapshot once an editor has mounted: the editor seeds it
 * with the loaded document and refreshes it as it unmounts, so it holds the latest
 * keystroke. A Board opened before any editor mounted reads the document as loaded, like
 * Export; pages are then unknown.
 */
export const useSceneBoardSource = (): SceneBoardSource => {
    const {initialValue, initialIndexSnapshot} = useScriptWorkspace();
    const liveIndex = useEditorLiveSelector(snapshot => snapshot.index);
    const scenePlacement = useEditorLiveScenePlacement();
    const {displayColorByKey} = useEditorLiveCharacters();

    const index = useMemo(() => {
        if (liveIndex !== EMPTY_EDITOR_INDEX) {
            return liveIndex;
        }

        return initialIndexSnapshot ?? buildScriptBlockIndex(initialValue).snapshot;
    }, [
        initialIndexSnapshot,
        initialValue,
        liveIndex,
    ]);

    const getStartPage = useCallback(
        (headingBlockId: string) => (scenePlacement.hasComputed ? scenePlacement.byBlockId.get(headingBlockId)?.startPage ?? null : null),
        [scenePlacement],
    );

    return {
        index,
        getStartPage,
        displayColorByKey,
    };
};

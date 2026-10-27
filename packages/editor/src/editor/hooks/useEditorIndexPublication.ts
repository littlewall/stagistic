import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect} from 'react';

import {type EditorSnapshotStore} from '../live/store';
import {buildIndexSnapshotFromPmDoc} from '../runtime/buildIndexSnapshotFromPmDoc';

/*
 * Mounting seeds the live index from the document as loaded, and typing refreshes it only
 * when something subscribes to it, which costs a full index per keystroke on a big script.
 * Other views (Board) read the index after the editor is gone, so the editor publishes it
 * once, as it unmounts: the cached surface holds the latest document, which can be newer
 * than the last autosave.
 */
export const useEditorIndexPublication = (
    instance: TiptapEditor | null,
    liveStore: EditorSnapshotStore,
) => {
    useEffect(() => {
        if (!instance) {
            return;
        }

        return () => {
            if (instance.isDestroyed) {
                return;
            }

            liveStore.patchSnapshot({index: buildIndexSnapshotFromPmDoc(instance.state.doc)});
        };
    }, [instance, liveStore]);
};

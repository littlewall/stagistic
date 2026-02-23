import {useCallback} from 'react';

import {useEditorInstance} from '../context';
import {findFountainBlockSelectionPosFromState} from '../tiptap/fountainCore';

/**
 * Returns a stable callback that scrolls the editor to a specific block and
 * places the cursor in it. Uses the editor instance from `EditorInstanceContext`
 * directly — no state, no request pattern, no re-renders on the caller.
 */
export const useFocusEditorBlock = () => {
    const editor = useEditorInstance();

    return useCallback((blockId: string) => {
        if (!editor) {
            return;
        }

        const targetPos = findFountainBlockSelectionPosFromState(editor.state, blockId);

        if (targetPos === null) {
            return;
        }

        editor
            .chain()
            .focus()
            .setTextSelection(targetPos)
            .run();
    }, [editor]);
};

import {useCallback} from 'react';

import {useEditorInstance} from '../context';
import {findFountainBlockByIdFromState} from '../tiptap/fountainCore';

/**
 * Returns a stable callback that scrolls the editor to a specific block and
 * places the cursor at the end of its content. Uses the editor instance from
 * `EditorInstanceContext` directly — no state, no request pattern, no re-renders
 * on the caller.
 */
export const useFocusEditorBlock = () => {
    const editor = useEditorInstance();

    return useCallback((blockId: string) => {
        if (!editor) {
            return;
        }

        const block = findFountainBlockByIdFromState(editor.state, blockId);

        if (!block) {
            return;
        }

        editor
            .chain()
            .focus()
            .setTextSelection(block.to)
            .run();
    }, [editor]);
};

import {useCallback} from 'react';

import {useEditorInstance} from '../context';
import {findFountainBlockByIdFromState} from '../tiptap/fountainCore';

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

        const {node} = editor.view.domAtPos(block.from);
        const element = node instanceof Element ? node : node.parentElement;

        element?.scrollIntoView({block: 'start'});
    }, [editor]);
};

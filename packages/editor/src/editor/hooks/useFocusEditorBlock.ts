import {useCallback} from 'react';

import {useEditorInstance} from '../context';
import {findScriptBlockByIdFromState} from '../tiptap/scriptCore';

export const useFocusEditorBlock = () => {
    const editor = useEditorInstance();

    return useCallback((blockId: string) => {
        if (!editor) {
            return;
        }

        const block = findScriptBlockByIdFromState(editor.state, blockId);

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

        // Tints the block on arrival so the jump has a visible target.
        editor.commands.flashBlockFocus(blockId);
    }, [editor]);
};

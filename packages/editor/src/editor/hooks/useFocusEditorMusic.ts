import {useCallback} from 'react';

import {useEditorInstance} from '../context';
import {focusMusicTitle} from '../tiptap/extensions/music/musicCommands';
import {useFocusEditorBlock} from './useFocusEditorBlock';

/**
 * Sidebar navigation for one music: the block jump, then the caret parked at
 * the end of the pill's own title. A music is navigated to in order to work on
 * it, so it lands exactly where clicking the pill by hand would have left it —
 * inside the pill, ready to type — rather than at the end of the block behind.
 */
export const useFocusEditorMusic = () => {
    const editor = useEditorInstance();
    const focusBlock = useFocusEditorBlock();

    return useCallback((startBlockId: string) => {
        focusBlock(startBlockId);

        if (!editor) {
            return;
        }

        focusMusicTitle(editor.view.dom, startBlockId);
    }, [editor, focusBlock]);
};

import {type BlockPages, useEditorLiveBlockPages} from '@stagistic/editor';
import {useCallback} from 'react';

/*
 * Where a block starts and ends on the pages (and whether it takes no height); null until
 * the editor has measured pagination. Separate from the board source so only the Rundown
 * re-renders when a block moves page.
 */
export const useBlockPages = (): (blockId: string) => BlockPages | null => {
    const blockPages = useEditorLiveBlockPages();

    return useCallback(
        (blockId: string) => (blockPages.hasComputed ? blockPages.byBlockId.get(blockId) ?? null : null),
        [blockPages],
    );
};

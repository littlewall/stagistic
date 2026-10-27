import {useEditorLiveScenePlacement, useFocusEditorBlock} from '@stagistic/editor';
import {useEffect, useRef} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {readEditorFocusBlockId} from '../workspace/editorFocusState';

const BLOCK_PARAM = 'block';

/*
 * Jumps to the block another view or a deep link asked for: router state from the Board
 * (see `EditorFocusState`) or a `?block=` parameter. Then clears the request, so a reload
 * or a StrictMode remount does not jump again. Waits for the first measured layout; a
 * cached editor surface already has one. Renders inside the editor to reach the instance.
 */
export const EditorFocusRequest = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const focusBlock = useFocusEditorBlock();
    const {hasComputed} = useEditorLiveScenePlacement();
    const handledBlockIdRef = useRef<string | null>(null);
    const {pathname, search} = location;
    const blockId = readEditorFocusBlockId(location.state) ?? new URLSearchParams(search).get(BLOCK_PARAM);

    useEffect(() => {
        if (!blockId || !hasComputed || handledBlockIdRef.current === blockId) {
            return;
        }

        const params = new URLSearchParams(search);

        params.delete(BLOCK_PARAM);
        handledBlockIdRef.current = blockId;
        focusBlock(blockId);
        void navigate({pathname, search: params.toString()}, {replace: true, state: null});
    }, [
        blockId,
        focusBlock,
        hasComputed,
        navigate,
        pathname,
        search,
    ]);

    return null;
};

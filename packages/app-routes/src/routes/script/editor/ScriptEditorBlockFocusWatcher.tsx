import {useFocusEditorBlock} from '@stagistic/editor';
import {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';

export const ScriptEditorBlockFocusWatcher = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const focusBlock = useFocusEditorBlock();
    const blockId = searchParams.get('block');

    useEffect(() => {
        if (!blockId) {
            return;
        }

        focusBlock(blockId);

        const next = new URLSearchParams(searchParams);

        next.delete('block');
        setSearchParams(next, {replace: true});
    }, [
        blockId,
        focusBlock,
        searchParams,
        setSearchParams,
    ]);

    return null;
};

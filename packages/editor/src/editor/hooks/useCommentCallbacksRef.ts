import {useLayoutEffect, useRef} from 'react';

import type {CommentsExtensionCallbacks} from '../tiptap/extensions/comments';

/** Read at event time by the comments plugin, so the latest host callbacks always win. */
export const useCommentCallbacksRef = (callbacks: CommentsExtensionCallbacks) => {
    const ref = useRef<CommentsExtensionCallbacks>({});

    useLayoutEffect(() => {
        ref.current = callbacks;
    });

    return ref;
};

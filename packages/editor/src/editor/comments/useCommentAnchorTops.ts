import {useEffect, useState} from 'react';

import {useEditorInstance} from '../context';
import {commentsPluginKey} from '../tiptap/extensions/comments';

const SCROLL_CONTAINER_SELECTOR = '[data-editor-scroll-container="true"]';

/** Key under which the unsaved draft's anchor top is reported. */
export const COMMENT_DRAFT_ANCHOR_KEY = '__draft__';

const isSameTops = (left: ReadonlyMap<string, number>, right: ReadonlyMap<string, number>) => {
    return left.size === right.size && [...left].every(([key, value]) => right.get(key) === value);
};

/*
 * Viewport tops (px) of each anchor's start, plus the draft's under
 * COMMENT_DRAFT_ANCHOR_KEY. Anchors whose block is not rendered (e.g. inside a
 * collapsed scene) are omitted.
 */
export const useCommentAnchorTops = (threadIds: readonly string[]): ReadonlyMap<string, number> => {
    const editor = useEditorInstance();
    const [tops, setTops] = useState<ReadonlyMap<string, number>>(() => new Map());
    const threadIdsKey = threadIds.join('|');

    useEffect(() => {
        if (!editor) {
            return undefined;
        }

        const ids = threadIdsKey ? threadIdsKey.split('|') : [];
        const scrollContainer = editor.view.dom.closest(SCROLL_CONTAINER_SELECTOR);
        let frame = 0;

        const measure = () => {
            frame = 0;

            if (editor.isDestroyed) {
                return;
            }

            const pluginState = commentsPluginKey.getState(editor.state);
            const anchors = pluginState?.anchors;
            const next = new Map<string, number>();

            if (pluginState?.draft) {
                next.set(COMMENT_DRAFT_ANCHOR_KEY, Math.round(editor.view.coordsAtPos(pluginState.draft.from).top));
            }

            ids.forEach(threadId => {
                const anchor = anchors?.get(threadId);

                if (!anchor) {
                    return;
                }

                const blockPos = editor.state.doc.resolve(anchor.from).before(1);
                const blockDom = editor.view.nodeDOM(blockPos);
                const rect = blockDom instanceof HTMLElement ? blockDom.getBoundingClientRect() : null;

                if (!rect || rect.height === 0) {
                    return;
                }

                next.set(threadId, anchor.kind === 'range' ? Math.round(editor.view.coordsAtPos(anchor.from).top) : Math.round(rect.top));
            });
            setTops(previous => (isSameTops(previous, next) ? previous : next));
        };
        const schedule = () => {
            if (!frame) {
                frame = requestAnimationFrame(measure);
            }
        };

        measure();
        editor.on('transaction', schedule);
        scrollContainer?.addEventListener('scroll', schedule, {passive: true});
        window.addEventListener('resize', schedule);

        return () => {
            cancelAnimationFrame(frame);
            editor.off('transaction', schedule);
            scrollContainer?.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
        };
    }, [editor, threadIdsKey]);

    return tops;
};

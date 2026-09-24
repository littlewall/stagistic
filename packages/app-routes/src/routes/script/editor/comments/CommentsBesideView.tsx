import type {ScriptCommentThread} from '@stagistic/app-core';
import {COMMENT_DRAFT_ANCHOR_KEY, type CommentAnchorLocation, useCommentAnchorTops, useEditorInstance} from '@stagistic/editor';
import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState, type WheelEvent} from 'react';

import {layoutBesideCards} from './layoutBesideCards';

import styles from './ScriptCommentsSidebar.module.css';

const DEFAULT_CARD_HEIGHT = 72;
const COLLAPSED_CARD_HEIGHT = 32;
const CARD_GAP = 8;
const SCROLL_CONTAINER_SELECTOR = '[data-editor-scroll-container="true"]';

interface CommentsBesideViewProps {
    threads: readonly ScriptCommentThread[];
    anchors: ReadonlyMap<string, CommentAnchorLocation>;
    activeThreadId: string | null;
    expandedBlockId: string | null;
    draft: {blockId: string} | null;
    onExpandBlock: (blockId: string) => void;
    renderCard: (thread: ScriptCommentThread) => ReactNode;
    renderDraft: () => ReactNode;
}

/* Heights of rendered slots, keyed by layout key; updated only when a size changes. */
const useMeasuredHeights = () => {
    const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map());
    const observerRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        observerRef.current = new ResizeObserver(entries => {
            setHeights(previous => {
                let next: Map<string, number> | null = null;

                entries.forEach(entry => {
                    const key = (entry.target as HTMLElement).dataset.layoutKey;
                    const height = Math.round(entry.target.getBoundingClientRect().height);

                    if (key && previous.get(key) !== height) {
                        next ??= new Map(previous);
                        next.set(key, height);
                    }
                });

                return next ?? previous;
            });
        });

        return () => observerRef.current?.disconnect();
    }, []);

    const observe = useCallback((element: HTMLElement | null) => {
        if (element) {
            observerRef.current?.observe(element);
        }
    }, []);

    return {heights, observe};
};

/** Cards aligned to their anchors, following the canvas scroll. */
export const CommentsBesideView = ({
    threads,
    anchors,
    activeThreadId,
    expandedBlockId,
    draft,
    onExpandBlock,
    renderCard,
    renderDraft,
}: CommentsBesideViewProps) => {
    const editor = useEditorInstance();
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const [bodyTop, setBodyTop] = useState(0);
    const {heights, observe} = useMeasuredHeights();
    const anchoredThreads = useMemo(() => threads.filter(thread => anchors.has(thread.id)), [anchors, threads]);
    const tops = useCommentAnchorTops(anchoredThreads.map(thread => thread.id));
    const threadById = useMemo(() => new Map(threads.map(thread => [thread.id, thread])), [threads]);

    useEffect(() => {
        const body = bodyRef.current;

        if (!body) {
            return undefined;
        }

        const update = () => setBodyTop(Math.round(body.getBoundingClientRect().top));
        const observer = new ResizeObserver(update);

        update();
        observer.observe(body);
        window.addEventListener('resize', update);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    const entries = useMemo(() => {
        const cards = anchoredThreads
            .filter(thread => tops.has(thread.id))
            .map(thread => ({
                threadId: thread.id,
                blockId: anchors.get(thread.id)?.blockId ?? '',
                anchorTop: (tops.get(thread.id) ?? 0) - bodyTop,
                height: heights.get(thread.id) ?? DEFAULT_CARD_HEIGHT,
            }));
        const draftTop = tops.get(COMMENT_DRAFT_ANCHOR_KEY);

        if (draft && draftTop !== undefined) {
            cards.push({
                threadId: COMMENT_DRAFT_ANCHOR_KEY,
                blockId: `${draft.blockId}:draft`,
                anchorTop: draftTop - bodyTop,
                height: heights.get(COMMENT_DRAFT_ANCHOR_KEY) ?? DEFAULT_CARD_HEIGHT,
            });
        }

        return layoutBesideCards({
            cards,
            activeThreadId: draft ? COMMENT_DRAFT_ANCHOR_KEY : activeThreadId,
            expandedBlockId,
            collapsedHeight: COLLAPSED_CARD_HEIGHT,
            gap: CARD_GAP,
        });
    }, [activeThreadId, anchoredThreads, anchors, bodyTop, draft, expandedBlockId, heights, tops]);

    // The panel does not scroll on its own; the wheel scrolls the script it annotates.
    const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
        editor?.view.dom.closest(SCROLL_CONTAINER_SELECTOR)?.scrollBy({top: event.deltaY});
    };

    return (
        <div ref={bodyRef} className={styles.besideBody} onWheel={handleWheel}>
            {entries.map(entry => {
                const thread = threadById.get(entry.threadIds[0]);

                return (
                    <div key={entry.key} ref={observe} className={styles.slot} style={{top: entry.top}} data-layout-key={entry.key}>
                        {entry.collapsed ? (
                            <button type="button" className={styles.collapsed} onClick={() => onExpandBlock(entry.blockId)}>
                                {`${entry.threadIds.length} comments`}
                            </button>
                        ) : entry.key === COMMENT_DRAFT_ANCHOR_KEY ? (
                            renderDraft()
                        ) : thread ? (
                            renderCard(thread)
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
};

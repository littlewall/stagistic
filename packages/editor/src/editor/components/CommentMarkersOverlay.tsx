import type {Editor as TiptapEditor} from '@tiptap/react';
import {type RefObject, useEffect, useState} from 'react';

import {commentsPluginKey} from '../tiptap/extensions/comments';
import {findScriptBlockByIdFromState} from '../tiptap/scriptCore';

import styles from './CommentMarkersOverlay.module.css';

interface CommentMarker {
    blockId: string;
    threadIds: readonly string[];
    top: number;
    /** Active or hovered thread lives here, or this block has an unsaved block draft. */
    isActive: boolean;
}

const readMarkers = (editor: TiptapEditor, canvas: HTMLElement): CommentMarker[] => {
    const pluginState = commentsPluginKey.getState(editor.state);
    const grouped = new Map(pluginState?.openThreadIdsByBlockId);
    const draftBlockId = pluginState?.draft?.kind === 'block' ? pluginState.draft.blockId : null;
    const highlighted = new Set([pluginState?.activeThreadId, pluginState?.hoveredThreadId]);
    const canvasRect = canvas.getBoundingClientRect();
    const markers: CommentMarker[] = [];

    if (draftBlockId && !grouped.has(draftBlockId)) {
        grouped.set(draftBlockId, []);
    }

    grouped.forEach((threadIds, blockId) => {
        const block = findScriptBlockByIdFromState(editor.state, blockId);
        const dom = block ? editor.view.nodeDOM(block.pos) : null;
        const rect = dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;

        // Blocks inside a collapsed scene have no box; they get no marker.
        if (rect && rect.height > 0) {
            markers.push({
                blockId,
                threadIds,
                top: Math.round(rect.top - canvasRect.top + canvas.scrollTop),
                isActive: blockId === draftBlockId || threadIds.some(threadId => highlighted.has(threadId)),
            });
        }
    });

    return markers;
};

const isSameMarkers = (left: readonly CommentMarker[], right: readonly CommentMarker[]) => {
    return (
        left.length === right.length &&
        left.every((marker, index) => {
            const other = right[index];

            return (
                other.blockId === marker.blockId &&
                other.top === marker.top &&
                other.isActive === marker.isActive &&
                other.threadIds.join('|') === marker.threadIds.join('|')
            );
        })
    );
};

interface CommentMarkersOverlayProps {
    editor: TiptapEditor | null;
    canvasRef: RefObject<HTMLElement | null>;
}

/** Right-margin markers for blocks with open comments; the only canvas control that opens the panel. */
export const CommentMarkersOverlay = ({editor, canvasRef}: CommentMarkersOverlayProps) => {
    const [markers, setMarkers] = useState<CommentMarker[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return undefined;
        }

        let frame = 0;
        const schedule = () => {
            if (frame) {
                return;
            }

            frame = requestAnimationFrame(() => {
                frame = 0;

                if (!editor.isDestroyed) {
                    const next = readMarkers(editor, canvas);

                    setMarkers(previous => (isSameMarkers(previous, next) ? previous : next));
                }
            });
        };
        const observer = new ResizeObserver(schedule);

        observer.observe(editor.view.dom);
        editor.on('transaction', schedule);
        schedule();

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            editor.off('transaction', schedule);
        };
    }, [canvasRef, editor]);

    if (!editor) {
        return null;
    }

    return markers.map(marker => {
        const count = marker.threadIds.length;

        return (
            <button
                key={marker.blockId}
                type="button"
                className={styles.marker}
                style={{top: marker.top}}
                data-comment-marker-block-id={marker.blockId}
                data-active={marker.isActive ? 'true' : undefined}
                aria-label={count === 0 ? 'New comment' : count === 1 ? '1 comment' : `${count} comments`}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                    editor
                        .chain()
                        .setActiveCommentThread(marker.threadIds[0] ?? null)
                        .requestCommentsReveal()
                        .run();
                }}
            >
                {count > 1 ? count : ''}
            </button>
        );
    });
};

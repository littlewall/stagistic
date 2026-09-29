import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import type {CommentsBaseState} from './commentsPluginState';
import type {CommentAnchorLocation} from './types';

import styles from './CommentsExtension.module.css';

/** Tints the whole block whose content starts at `contentFrom`; hover uses a lighter tint. */
const blockHighlight = (doc: ProseMirrorNode, contentFrom: number, tone: 'active' | 'hovered' = 'active') => {
    const $pos = doc.resolve(contentFrom);

    if ($pos.depth === 0) {
        return null;
    }

    const blockPos = $pos.before($pos.depth);

    return Decoration.node(blockPos, blockPos + $pos.parent.nodeSize, {
        class: tone === 'active' ? styles.blockActive : styles.blockHovered,
        'data-comment-block-active': tone === 'active' ? 'true' : undefined,
        'data-comment-block-hovered': tone === 'hovered' ? 'true' : undefined,
    });
};

const anchorClass = (tone: 'active' | 'hovered' | null) => {
    if (tone === 'active') {
        return `${styles.anchor} ${styles.anchorActive}`;
    }

    return tone === 'hovered' ? `${styles.anchor} ${styles.anchorHovered}` : styles.anchor;
};

type DecorationInput = CommentsBaseState & {
    anchors: ReadonlyMap<string, CommentAnchorLocation>;
    openThreadIdsByBlockId: ReadonlyMap<string, readonly string[]>;
};

export const buildDecorations = (doc: ProseMirrorNode, state: DecorationInput) => {
    // Active/hovered threads tint what they belong to: the underlined text for range
    // anchors, the whole block for block anchors. The margin marker marks both.
    const decorations: Decoration[] = [];
    // Hover is a lighter tint than the active thread, which wins when both apply.
    const hovered = new Set([
        ...(state.hoveredThreadId ? [state.hoveredThreadId] : []),
        ...(state.hoveredBlockId ? (state.openThreadIdsByBlockId.get(state.hoveredBlockId) ?? []) : []),
    ]);
    const toneOf = (threadId: string) => (threadId === state.activeThreadId ? 'active' : hovered.has(threadId) ? 'hovered' : null);

    [...hovered, ...(state.activeThreadId ? [state.activeThreadId] : [])].forEach(threadId => {
        const anchor = state.anchors.get(threadId);
        const tone = toneOf(threadId);

        if (tone && anchor?.kind === 'block' && state.threads.get(threadId)?.status === 'open') {
            const decoration = blockHighlight(doc, anchor.from, tone);

            if (decoration) {
                decorations.push(decoration);
            }
        }
    });

    doc.descendants((node, pos) => {
        if (!node.isText) {
            return true;
        }

        node.marks.forEach(mark => {
            const threadId = String(mark.attrs[COMMENT_THREAD_ID_ATTR] ?? '');

            if (mark.type.name !== COMMENT_ANCHOR_MARK_NAME || state.threads.get(threadId)?.status !== 'open') {
                return;
            }

            decorations.push(
                Decoration.inline(pos, pos + node.nodeSize, {
                    class: anchorClass(toneOf(threadId)),
                    'data-comment-anchor': threadId,
                }),
            );
        });

        return false;
    });

    if (state.draft?.kind === 'range') {
        decorations.push(Decoration.inline(state.draft.from, state.draft.to, {class: styles.draft}));
    }

    if (state.draft?.kind === 'block') {
        const decoration = blockHighlight(doc, state.draft.from);

        if (decoration) {
            decorations.push(decoration);
        }
    }

    return DecorationSet.create(doc, decorations);
};

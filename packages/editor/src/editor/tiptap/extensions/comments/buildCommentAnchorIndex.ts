import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {CommentAnchorLocation, EditorCommentThreadRef} from './types';

const isScriptBlock = (node: ProseMirrorNode) => node.isTextblock && typeof node.attrs.id === 'string';

const groupBlockAnchors = (threads: ReadonlyMap<string, EditorCommentThreadRef>) => {
    const byBlockId = new Map<string, string[]>();

    threads.forEach(thread => {
        if (thread.anchorKind === 'block' && thread.anchorBlockId) {
            byBlockId.set(thread.anchorBlockId, [...(byBlockId.get(thread.anchorBlockId) ?? []), thread.id]);
        }
    });

    return byBlockId;
};

/*
 * Range anchors come from marks (any thread id, known or not); block anchors from
 * host thread refs whose block still exists. Missing = Detached.
 */
export const buildCommentAnchorIndex = (doc: ProseMirrorNode, threads: ReadonlyMap<string, EditorCommentThreadRef>): Map<string, CommentAnchorLocation> => {
    const index = new Map<string, CommentAnchorLocation>();
    const blockAnchorsByBlockId = groupBlockAnchors(threads);
    let blockIndex = -1;
    let scene: {id: string; title: string} | null = null;

    doc.descendants((node, pos) => {
        if (!isScriptBlock(node)) {
            return true;
        }

        blockIndex += 1;

        const blockId = String(node.attrs.id);

        if (node.attrs.blockType === 'scene' || node.type.name === 'scene') {
            scene = {id: blockId, title: node.textContent};
        }

        const contentFrom = pos + 1;
        const currentScene: {id: string; title: string} | null = scene;
        const base = {
            blockId,
            blockIndex,
            sceneBlockId: currentScene?.id ?? null,
            sceneTitle: currentScene?.title ?? '',
        };

        blockAnchorsByBlockId.get(blockId)?.forEach(threadId => {
            if (!index.has(threadId)) {
                index.set(threadId, {threadId, kind: 'block', from: contentFrom, to: contentFrom + node.content.size, ...base});
            }
        });

        node.forEach((child, offset) => {
            child.marks.forEach(mark => {
                if (mark.type.name !== COMMENT_ANCHOR_MARK_NAME) {
                    return;
                }

                const threadId = String(mark.attrs[COMMENT_THREAD_ID_ATTR] ?? '');

                if (!threadId) {
                    return;
                }

                const from = contentFrom + offset;
                const to = from + child.nodeSize;
                const existing = index.get(threadId);

                index.set(
                    threadId,
                    existing?.kind === 'range'
                        ? {...existing, from: Math.min(existing.from, from), to: Math.max(existing.to, to)}
                        : {threadId, kind: 'range', from, to, ...base},
                );
            });
        });

        return false;
    });

    return index;
};

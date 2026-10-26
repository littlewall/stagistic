import type {ScriptDocument, ScriptNode} from '../document';

export const COMMENT_ANCHOR_MARK_NAME = 'commentAnchor';
export const COMMENT_THREAD_ID_ATTR = 'threadId';

type InlineMark = NonNullable<ScriptNode['marks']>[number];

const readCommentThreadId = (mark: InlineMark): string | null => {
    if (mark.type !== COMMENT_ANCHOR_MARK_NAME) {
        return null;
    }

    const value = mark.attrs?.[COMMENT_THREAD_ID_ATTR];

    return typeof value === 'string' && value.length > 0 ? value : null;
};

const visit = (node: ScriptNode, ids: Set<string>) => {
    node.marks?.forEach(mark => {
        const threadId = readCommentThreadId(mark);

        if (threadId) {
            ids.add(threadId);
        }
    });
    node.content?.forEach(child => visit(child, ids));
};

export const collectCommentAnchorThreadIds = (document: ScriptDocument): Set<string> => {
    const ids = new Set<string>();

    document.content.forEach(node => visit(node, ids));

    return ids;
};

const stripNode = (node: ScriptNode, keepThreadIds: ReadonlySet<string>): ScriptNode => {
    const marks = node.marks?.filter(mark => {
        const threadId = readCommentThreadId(mark);

        return mark.type !== COMMENT_ANCHOR_MARK_NAME || (threadId !== null && keepThreadIds.has(threadId));
    });
    const next: ScriptNode = {...node};

    if (marks && marks.length > 0) {
        next.marks = marks;
    } else {
        delete next.marks;
    }

    if (node.content) {
        next.content = node.content.map(child => stripNode(child, keepThreadIds));
    }

    return next;
};

/**
 * Remove comment anchor marks whose thread is not kept. Used when restoring
 * a stored script state, so deleted threads never come back with their text.
 */
export const stripCommentAnchors = (document: ScriptDocument, keepThreadIds: ReadonlySet<string>): ScriptDocument => ({
    ...document,
    content: document.content.map(node => stripNode(node, keepThreadIds)),
});

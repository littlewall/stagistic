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

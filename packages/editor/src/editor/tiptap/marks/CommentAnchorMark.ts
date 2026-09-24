import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR} from '@stagistic/script';
import {Mark, mergeAttributes} from '@tiptap/core';
import {Fragment, type Node as ProseMirrorNode, Slice} from '@tiptap/pm/model';
import {Plugin, PluginKey} from '@tiptap/pm/state';

const stripAnchorMarks = (fragment: Fragment): Fragment => {
    const children: ProseMirrorNode[] = [];

    fragment.forEach(child => {
        const marks = child.marks.filter(mark => mark.type.name !== COMMENT_ANCHOR_MARK_NAME);

        children.push(child.isText ? child.mark(marks) : child.copy(stripAnchorMarks(child.content)).mark(marks));
    });

    return Fragment.fromArray(children);
};

/*
 * Range anchor of a private comment thread. Unstyled on purpose: the comments
 * extension decorates only open threads, so resolved anchors render as plain text.
 */
export const CommentAnchorMark = Mark.create({
    name: COMMENT_ANCHOR_MARK_NAME,
    inclusive: false,
    excludes: '',

    addAttributes() {
        return {
            [COMMENT_THREAD_ID_ATTR]: {
                default: '',
                parseHTML: element => element.getAttribute('data-comment-thread-id') ?? '',
                renderHTML: attributes => ({'data-comment-thread-id': String(attributes[COMMENT_THREAD_ID_ATTR] ?? '')}),
            },
        };
    },

    parseHTML() {
        return [{tag: 'span[data-comment-thread-id]'}];
    },

    renderHTML({HTMLAttributes}) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('comment-anchor-paste'),
                props: {
                    // Copies never duplicate a thread's anchor.
                    transformPasted: slice => new Slice(stripAnchorMarks(slice.content), slice.openStart, slice.openEnd),
                },
            }),
        ];
    },
});

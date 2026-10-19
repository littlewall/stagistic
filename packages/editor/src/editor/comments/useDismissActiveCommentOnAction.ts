import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEffect} from 'react';

import {commentsPluginKey} from '../tiptap/extensions/comments';

/* Controls outside comments; editor caret and selection changes are handled separately. */
const ACTION_SELECTOR = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    'label',
    'summary',
    '[role="button"]',
    '[role="checkbox"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="option"]',
    '[role="radio"]',
    '[role="slider"]',
    '[role="switch"]',
    '[role="tab"]',
].join(', ');

/*
 * Comment UI owns the active thread: the panel and its cards, the margin markers, and
 * transient overlays (card menus, popovers) portalled out of the panel.
 */
const COMMENT_SCOPE_SELECTOR = [
    '[data-comments-panel]',
    '[data-comment-marker-block-id]',
    '[role="menu"]',
    '[role="dialog"]',
    '[role="alertdialog"]',
    '[role="listbox"]',
].join(', ');

const isActionOutsideComments = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
        return false;
    }

    return Boolean(target.closest(ACTION_SELECTOR)) && !target.closest(COMMENT_SCOPE_SELECTOR);
};

/** Closes the active comment once the user acts anywhere else (e.g. search), so their tints never compete. */
export const useDismissActiveCommentOnAction = (editor: TiptapEditor | null) => {
    useEffect(() => {
        if (!editor) {
            return;
        }

        const dismiss = (event: Event) => {
            if (editor.isDestroyed || !commentsPluginKey.getState(editor.state)?.activeThreadId || !isActionOutsideComments(event.target)) {
                return;
            }

            editor.commands.setActiveCommentThread(null);
        };

        const dismissOnSelection = () => {
            if (editor.isDestroyed) {
                return;
            }

            const state = commentsPluginKey.getState(editor.state);
            const threadId = state?.activeThreadId;

            if (!threadId) {
                return;
            }

            const anchor = state.anchors.get(threadId);
            const {selection} = editor.state;

            if (anchor && selection.from >= anchor.from && selection.to <= anchor.to) {
                return;
            }

            editor.commands.setActiveCommentThread(null);
        };

        // Capture: a control may stop propagation; focusin covers keyboard routes such as Mod+F.
        document.addEventListener('pointerdown', dismiss, true);
        document.addEventListener('focusin', dismiss, true);
        editor.on('selectionUpdate', dismissOnSelection);

        return () => {
            document.removeEventListener('pointerdown', dismiss, true);
            document.removeEventListener('focusin', dismiss, true);
            editor.off('selectionUpdate', dismissOnSelection);
        };
    }, [editor]);
};

import type {Editor as TiptapEditor} from '@tiptap/react';
import {type MouseEvent as ReactMouseEvent, type RefObject, useEffect, useState} from 'react';

import {commentsPluginKey} from '../tiptap/extensions/comments';

import styles from './SelectionToolbarOverlay.module.css';

const TOOLBAR_GAP_PX = 8;

interface ToolbarPosition {
    top: number;
    left: number;
}

const readPosition = (editor: TiptapEditor, canvas: HTMLElement): ToolbarPosition | null => {
    const {selection} = editor.state;

    if (editor.isDestroyed || !editor.isFocused || selection.empty || commentsPluginKey.getState(editor.state)?.draft) {
        return null;
    }

    const start = editor.view.coordsAtPos(selection.from);
    const end = editor.view.coordsAtPos(selection.to);
    const canvasRect = canvas.getBoundingClientRect();
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);

    return {
        top: Math.round(start.top - canvasRect.top + canvas.scrollTop - TOOLBAR_GAP_PX),
        left: Math.round((left + right) / 2 - canvasRect.left),
    };
};

// Buttons must not take focus, or the editor loses the selection they act on.
const keepEditorSelection = (event: ReactMouseEvent) => event.preventDefault();

interface SelectionToolbarOverlayProps {
    editor: TiptapEditor | null;
    canvasRef: RefObject<HTMLElement | null>;
}

export const SelectionToolbarOverlay = ({editor, canvasRef}: SelectionToolbarOverlayProps) => {
    const [position, setPosition] = useState<ToolbarPosition | null>(null);
    const [isPointerDown, setIsPointerDown] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return undefined;
        }

        // Captured now: on unmount the editor may already be destroyed and its view gone.
        const editorDom = editor.view.dom;
        const update = () => setPosition(readPosition(editor, canvas));
        const handlePointerDown = () => setIsPointerDown(true);
        const handlePointerUp = () => {
            setIsPointerDown(false);
            update();
        };

        editor.on('transaction', update);
        editor.on('focus', update);
        editor.on('blur', update);
        editorDom.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('mouseup', handlePointerUp);
        update();

        return () => {
            editor.off('transaction', update);
            editor.off('focus', update);
            editor.off('blur', update);
            editorDom.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('mouseup', handlePointerUp);
        };
    }, [canvasRef, editor]);

    if (!editor || !position || isPointerDown) {
        return null;
    }

    const copySelection = () => {
        const {from, to} = editor.state.selection;

        void navigator.clipboard.writeText(editor.state.doc.textBetween(from, to, '\n'));
    };

    return (
        <div className={styles.toolbar} role="toolbar" aria-label="Selection actions" style={{top: position.top, left: position.left}}>
            <button type="button" className={styles.button} onMouseDown={keepEditorSelection} onClick={() => editor.commands.startCommentDraft()}>
                Comment
            </button>
            <button type="button" className={styles.button} onMouseDown={keepEditorSelection} onClick={copySelection}>
                Copy
            </button>
        </div>
    );
};

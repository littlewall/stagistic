import {type Editor as TiptapEditor, EditorContent} from '@tiptap/react';
import clsx from 'clsx';
import {useRef} from 'react';

import EditorBlockActionsOverlay from './EditorBlockActionsOverlay';
import styles from './EditorCanvas.module.css';

type EditorCanvasProps = {
    editor: TiptapEditor | null,
    autoFocus?: boolean,
};

export const EditorCanvas = ({editor, autoFocus}: EditorCanvasProps) => {
    const canvasRef = useRef<HTMLElement | null>(null);

    return (
        <section className={styles.canvas} ref={canvasRef}>
            <EditorContent
                className={clsx(styles.content)}
                editor={editor}
                spellCheck={false}
                autoFocus={autoFocus}
            />
            <EditorBlockActionsOverlay editor={editor} canvasRef={canvasRef} />
        </section>
    );
};

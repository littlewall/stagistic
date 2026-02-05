import {type Editor as TiptapEditor, EditorContent} from '@tiptap/react';
import clsx from 'clsx';
import {type CSSProperties, useRef} from 'react';

import EditorBlockActionsOverlay from './EditorBlockActionsOverlay';
import styles from './EditorCanvas.module.css';

type EditorCanvasProps = {
    editor: TiptapEditor | null,
    autoFocus?: boolean,
    style?: CSSProperties,
};

export const EditorCanvas = ({editor, autoFocus, style}: EditorCanvasProps) => {
    const canvasRef = useRef<HTMLElement | null>(null);

    return (
        <section
            className={styles.canvas}
            data-editor-scroll-container="true"
            ref={canvasRef}
            style={style}
        >
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

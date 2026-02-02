import clsx from 'clsx';
import {
    PlateContent,
    type PlateContentProps,
    useEditorValue,
    useValueVersion,
} from 'platejs/react';
import {useRef} from 'react';

import EditorBlockControlsOverlay from './EditorBlockControlsOverlay';
import styles from './EditorCanvas.module.css';

type EditorCanvasProps = Pick<PlateContentProps, 'renderLeaf' | 'autoFocus'>;

export const EditorCanvas = ({renderLeaf, autoFocus}: EditorCanvasProps) => {
    // Subscribe to editor value updates to ensure content re-renders on transforms.
    useEditorValue();
    useValueVersion();
    const canvasRef = useRef<HTMLElement | null>(null);

    return (
        <section className={styles.canvas} ref={canvasRef}>
            <PlateContent
                className={clsx(styles.content)}
                spellCheck={false}
                renderLeaf={renderLeaf}
                autoFocus={autoFocus}
            />
            <EditorBlockControlsOverlay canvasRef={canvasRef} />
        </section>
    );
};

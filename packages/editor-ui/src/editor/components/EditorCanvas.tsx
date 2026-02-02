import clsx from 'clsx';
import {
    PlateContent,
    type PlateContentProps,
    useEditorValue,
    useValueVersion,
} from 'platejs/react';

import styles from './EditorCanvas.module.css';

type EditorCanvasProps = Pick<PlateContentProps, 'renderLeaf' | 'autoFocus'>;

export const EditorCanvas = ({renderLeaf, autoFocus}: EditorCanvasProps) => {
    // Subscribe to editor value updates to ensure content re-renders on transforms.
    useEditorValue();
    useValueVersion();

    return (
        <section className={styles.canvas}>
            <PlateContent
                className={clsx(styles.content)}
                spellCheck={false}
                renderLeaf={renderLeaf}
                autoFocus={autoFocus}
            />
        </section>
    );
};

import clsx from 'clsx';
import {PlateContent, type PlateContentProps} from 'platejs/react';

import styles from './EditorCanvas.module.css';

type EditorCanvasProps = Pick<PlateContentProps, 'renderLeaf' | 'autoFocus'>;

export const EditorCanvas = ({renderLeaf, autoFocus}: EditorCanvasProps) => {
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

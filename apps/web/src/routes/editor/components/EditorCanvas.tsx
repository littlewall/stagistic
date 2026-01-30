import clsx from 'clsx';
import { PlateContent } from 'platejs/react';
import styles from './EditorCanvas.module.css';

export function EditorCanvas() {
    return (
        <section className={styles.canvas}>
            <PlateContent className={clsx(styles.content)} spellCheck autoFocus />
        </section>
    );
}

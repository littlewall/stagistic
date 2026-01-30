import clsx from 'clsx';
import styles from './EditorToolbar.module.css';

export function EditorToolbar() {
    return (
        <div className={styles.toolbar}>
            <span className={styles.title}>Fountain Editor</span>
            <div className={styles.actions}>
                <button type="button" className={clsx(styles.button)}>
                    Export
                </button>
                <button type="button" className={clsx(styles.button)}>
                    Share
                </button>
            </div>
        </div>
    );
}

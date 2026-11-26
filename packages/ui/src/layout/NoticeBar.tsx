import styles from './NoticeBar.module.css';

type NoticeBarProps = {
    /** Plain text; never rendered as markup. */
    message: string,
    actionLabel: string,
    onAction: () => void,
    onHide: () => void,
};

/*
 * Thin bar below the app header: one plain-text sentence, one action, Hide.
 * Hosts pass it to AppBannerProvider; AppLayout gives it its own 28px row so it never overlays the script.
 */
export const NoticeBar = ({
    message,
    actionLabel,
    onAction,
    onHide,
}: NoticeBarProps) => (
    <div className={styles.bar} role="region" aria-label="Notice">
        <span className={styles.message}>{message}</span>
        <button className={styles.action} type="button" onClick={onAction}>{actionLabel}</button>
        <button className={styles.action} type="button" onClick={onHide}>Hide</button>
    </div>
);

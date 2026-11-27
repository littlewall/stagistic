import clsx from 'clsx';

import styles from './NoticeBar.module.css';

type NoticeBarProps = {
    /** Plain text; never rendered as markup. */
    message: string,
    /** Shown right after the message, underlined. */
    actionLabel: string,
    onAction: () => void,
    onHide: () => void,
    /** `page` keeps the content in the page column (homepage); the bar itself stays full width. */
    width?: 'full' | 'page',
};

/*
 * Thin bar below the app header: one plain-text sentence with its action, and Hide at the end.
 * Hosts pass it to AppBannerProvider; AppLayout gives it its own 28px row so it never overlays the script.
 */
export const NoticeBar = ({
    message,
    actionLabel,
    onAction,
    onHide,
    width = 'full',
}: NoticeBarProps) => (
    <div className={styles.bar} role="region" aria-label="Notice">
        <div className={clsx(styles.inner, width === 'page' && styles.page)} data-notice-inner>
            <span className={styles.lead}>
                <span className={styles.message}>{message}</span>
                <button className={styles.action} type="button" onClick={onAction}>{actionLabel}</button>
            </span>
            <button className={styles.action} type="button" onClick={onHide}>Hide</button>
        </div>
    </div>
);

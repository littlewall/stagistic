import styles from './PublicPreviewNotice.module.css';

export const PublicPreviewNotice = () => (
    <div className={styles.notice}>
        <h2 className={styles.title}>Public preview notice</h2>
        <p className={styles.introduction}>
            Stagistic Editor is in public preview. It may contain errors or
            behave unexpectedly. Use it at your own risk.
        </p>
        <ul className={styles.points}>
            <li>
                Your scripts and attachments are stored only in this browser. Sync is not
                available yet.
            </li>
            <li>
                Nothing you create is sent from your device. Stagistic does not send
                analytics, telemetry, or other usage data.
            </li>
            <li>
                Some preferences, including theme and layout, are stored locally in your
                browser.
            </li>
            <li>
                Back up your work regularly. Clearing browser data or losing access to this
                browser may permanently remove it.
            </li>
        </ul>
    </div>
);

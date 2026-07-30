import styles from './PrereleaseNotice.module.css';

export const PrereleaseNotice = () => (
    <div className={styles.notice}>
        <h2 className={styles.title}>Pre-release notice</h2>
        <p className={styles.introduction}>
            Stagistic Editor is experimental pre-release software. It may contain errors or
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

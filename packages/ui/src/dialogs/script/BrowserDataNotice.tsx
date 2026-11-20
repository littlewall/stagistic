import styles from './BrowserDataNotice.module.css';

/** Where the browser version keeps scripts, and what that means. Web only: the desktop app stores files differently. */
export const BrowserDataNotice = () => (
    <div className={styles.notice}>
        <h2 className={styles.title}>Your scripts live in this browser</h2>
        <ul className={styles.points}>
            <li>Scripts are stored only in this browser, on this device.</li>
            <li>Clearing browser data removes them.</li>
            <li>Back up your work regularly by exporting your scripts.</li>
        </ul>
    </div>
);

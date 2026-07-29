import {MiniScriptEditor} from '@stagistic/editor';

import styles from './LandingMiniEditor.module.css';
import {miniEditorDocument} from './miniEditorDocument';

const MiniEditorFallback = () => (
    <div className={styles.fallback} aria-hidden="true">
        <p className={`${styles.fallbackBlock} ${styles.scene}`}>INSIDE THE LIGHTHOUSE</p>
        <p className={`${styles.fallbackBlock} ${styles.stageDirection}`}>
            An old brass lamp stands beneath the great lens.
        </p>
        <p className={`${styles.fallbackBlock} ${styles.character} ${styles.eli}`}>ELI</p>
        <p className={`${styles.fallbackBlock} ${styles.dialogue}`}>No oil. No flame.</p>
        <p className={`${styles.fallbackBlock} ${styles.character} ${styles.mara}`}>MARA</p>
        <p className={`${styles.fallbackBlock} ${styles.dialogue}`}>
            My father said this lamp once answered a song.
        </p>
        <p className={`${styles.fallbackBlock} ${styles.character} ${styles.eli}`}>ELI</p>
        <p className={`${styles.fallbackBlock} ${styles.aside}`}>skeptically</p>
        <p className={`${styles.fallbackBlock} ${styles.dialogue}`}>Of course it did.</p>
        <p className={`${styles.fallbackBlock} ${styles.character} ${styles.mara}`}>MARA</p>
        <p className={`${styles.fallbackBlock} ${styles.dialogue}`}>
            Tonight, we need to believe him.
        </p>
        <p className={`${styles.fallbackBlock} ${styles.stageDirection}`}>
            {'Music starts to play. '}
            <span className={styles.music}>2) One Small Light</span>
        </p>
    </div>
);

const LandingMiniEditor = () => (
    <MiniScriptEditor
        document={miniEditorDocument}
        musicNumberLabel="2)"
        staticFallback={<MiniEditorFallback />}
    />
);

export default LandingMiniEditor;

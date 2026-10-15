import {MiniScriptEditor} from '@stagistic/editor';

import styles from './LandingMiniEditor.module.css';
import {miniEditorDocument} from './miniEditorDocument';

const LandingMiniEditor = () => (
    <div className={styles.content}>
        <MiniScriptEditor
            document={miniEditorDocument}
            musicNumberLabel="1)"
        />
    </div>
);

export default LandingMiniEditor;

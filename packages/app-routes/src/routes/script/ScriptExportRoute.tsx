import {AppLayout} from '@stagistic/ui';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import styles from './ScriptExportRoute.module.css';
import {useScriptWorkspace} from './ScriptWorkspaceContext';

export const ScriptExportRoute = () => {
    const {currentScript, recentScripts} = useScriptWorkspace();

    return (
        <AppLayout
            header={currentScript ? (
                <ScriptEditorAppHeader
                    currentScript={currentScript}
                    recentScripts={recentScripts}
                    activeView="export"
                />
            ) : null}
        >
            <div className={styles.placeholder}>
                <p className={styles.heading}>Export</p>
                <p className={styles.subtitle}>Coming soon</p>
            </div>
        </AppLayout>
    );
};

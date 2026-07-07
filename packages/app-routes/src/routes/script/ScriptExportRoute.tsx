import {AppLayout} from '@stagistic/ui';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import {ExportControlPanel} from './export/ExportControlPanel';
import {ExportPreview} from './export/ExportPreview';
import {ExportProvider} from './export/ExportProvider';
import {useExportScriptData} from './export/useExportScriptData';
import styles from './ScriptExportRoute.module.css';
import {useScriptWorkspace} from './ScriptWorkspaceContext';

export const ScriptExportRoute = () => {
    const {currentScript, recentScripts} = useScriptWorkspace();
    const {script, settings} = useExportScriptData();

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
            {script ? (
                <ExportProvider script={script} settings={settings}>
                    <div className={styles.shell}>
                        <ExportControlPanel />
                        <ExportPreview />
                    </div>
                </ExportProvider>
            ) : (
                <div className={styles.placeholder}>No script loaded.</div>
            )}
        </AppLayout>
    );
};

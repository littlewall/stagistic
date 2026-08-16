import {serializeStagistic} from '@stagistic/script';
import {AppLayout} from '@stagistic/ui';
import {useCallback} from 'react';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../useDocumentTitle';
import {downloadStagistic} from './downloadStagistic';
import {ExportControlPanel} from './export/ExportControlPanel';
import {ExportPreview} from './export/ExportPreview';
import {ExportProvider} from './export/ExportProvider';
import {useExportScriptData} from './export/useExportScriptData';
import styles from './ScriptExportRoute.module.css';
import {useScriptWorkspace} from './ScriptWorkspaceContext';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalProvider';

export const ScriptExportRoute = () => {
    const {currentScript} = useScriptWorkspace();

    useDocumentTitle(currentScript ? `Export · ${currentScript.name}` : 'Export');

    const {script, settings} = useExportScriptData();
    const {
        openSettingsModal,
        openAttributeManagerModal,
        scriptTitleDraft,
        updateScriptTitle,
        musicAttachmentsState,
    } = useScriptSettingsModal();

    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'settings') {
            openSettingsModal();

            return;
        }

        if (actionId === 'attributes') {
            openAttributeManagerModal();

            return;
        }

        if (actionId === 'export-stagistic' && script) {
            const content = serializeStagistic(script.doc, {
                scriptTitle: scriptTitleDraft,
                titlePage: script.titlePage ?? undefined,
            });

            downloadStagistic(scriptTitleDraft, content);
        }
    }, [
        openAttributeManagerModal,
        openSettingsModal,
        script,
        scriptTitleDraft,
    ]);

    return (
        <AppLayout
            header={currentScript ? (
                <ScriptEditorAppHeader
                    currentScript={{...currentScript, name: scriptTitleDraft}}
                    onMenuAction={handleMenuAction}
                    onRenameScript={updateScriptTitle}
                    activeView="export"
                />
            ) : null}
        >
            {script ? (
                <ExportProvider
                    script={script}
                    settings={settings}
                    musicAttachments={musicAttachmentsState}
                >
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

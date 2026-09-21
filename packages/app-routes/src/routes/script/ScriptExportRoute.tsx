import {exportScriptPackage, useScriptRepository} from '@stagistic/app-core';
import {serializeStagistic} from '@stagistic/script';
import {AppLayout, LoaderOverlay} from '@stagistic/ui';
import {useCallback, useState} from 'react';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../useDocumentTitle';
import {downloadBlob, downloadStagistic} from './downloadStagistic';
import {ExportControlPanel} from './export/ExportControlPanel';
import {ExportPreview} from './export/ExportPreview';
import {ExportProvider} from './export/ExportProvider';
import {useExportScriptData} from './export/useExportScriptData';
import {useScriptWorkspace} from './ScriptWorkspaceContext';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalProvider';

import styles from './ScriptExportRoute.module.css';

export const ScriptExportRoute = () => {
    const {currentScript} = useScriptWorkspace();
    const repository = useScriptRepository();
    const [isPreparingPackage, setIsPreparingPackage] = useState(false);

    useDocumentTitle(currentScript ? `Export · ${currentScript.name}` : 'Export');

    const {script, settings} = useExportScriptData();
    const {openSettingsModal, openAttributeManagerModal, scriptTitleDraft, updateScriptTitle, musicAttachmentsState} = useScriptSettingsModal();

    const handleMenuAction = useCallback(
        (actionId: string) => {
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

                return;
            }

            if (actionId === 'export-stepkg' && currentScript) {
                setIsPreparingPackage(true);
                void new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
                    .then(() =>
                        exportScriptPackage({
                            repository,
                            scriptId: currentScript.id,
                            generator: {name: 'Stagistic', version: 'web'},
                        }),
                    )
                    .then(result => {
                        if (result.ok) {
                            downloadBlob(result.fileName, result.blob);
                        }
                    })
                    .catch(() => undefined)
                    .finally(() => setIsPreparingPackage(false));
            }
        },
        [openAttributeManagerModal, openSettingsModal, script, scriptTitleDraft, currentScript, repository],
    );

    return (
        <AppLayout
            header={
                currentScript ? (
                    <ScriptEditorAppHeader
                        currentScript={{...currentScript, name: scriptTitleDraft}}
                        onMenuAction={handleMenuAction}
                        onRenameScript={updateScriptTitle}
                        activeView="export"
                    />
                ) : null
            }
        >
            {isPreparingPackage ? <LoaderOverlay variant="scrim" label="Preparing package" messages={[]} /> : null}
            {script ? (
                <ExportProvider script={script} settings={settings} musicAttachments={musicAttachmentsState}>
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

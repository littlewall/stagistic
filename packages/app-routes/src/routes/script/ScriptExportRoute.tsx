import {
    exportScriptPackage,
    getScriptSnapshotLabel,
    useScriptRepository,
} from '@stagistic/app-core';
import {serializeStagistic} from '@stagistic/script';
import {AppLayout, LoaderOverlay} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import {downloadBlob, downloadStagistic} from '../../shared/downloadStagistic';
import {useDocumentTitle} from '../../shared/useDocumentTitle';
import {ExportControlPanel} from './export/ExportControlPanel';
import {ExportPreview} from './export/ExportPreview';
import {ExportProvider, type SaveScriptStateKind} from './export/ExportProvider';
import {useExportScriptData} from './export/useExportScriptData';
import styles from './ScriptExportRoute.module.css';
import {useScriptSettingsModal} from './settings/ScriptSettingsModalContext';
import {useScriptStateControls} from './states/useScriptStateControls';
import {useScriptAccess} from './workspace/ScriptAccessContext';
import {useScriptWorkspace} from './workspace/ScriptWorkspaceContext';

export const ScriptExportRoute = () => {
    const {currentScript} = useScriptWorkspace();
    const repository = useScriptRepository();
    const [isPreparingPackage, setIsPreparingPackage] = useState(false);
    const {
        isReadOnly,
        snapshot,
        liveScriptTitle,
    } = useScriptAccess();
    const snapshotLabel = snapshot ? getScriptSnapshotLabel(snapshot) : null;

    const {script, settings} = useExportScriptData();
    const {
        openSettingsModal,
        openAttributeManagerModal,
        scriptTitleDraft,
        updateScriptTitle,
        musicAttachmentsState,
    } = useScriptSettingsModal();
    const shownTitle = isReadOnly ? liveScriptTitle ?? scriptTitleDraft : scriptTitleDraft;
    // Files of a saved draft or version carry its label, e.g. “The door – Draft #3”.
    const fileTitle = snapshotLabel ? `${shownTitle} – ${snapshotLabel}` : shownTitle;
    const scriptStateControls = useScriptStateControls({scriptId: currentScript?.id ?? null, view: 'export'});
    const {openSave} = scriptStateControls;
    const saveAndDownload = useMemo(() => isReadOnly ? null : (kind: SaveScriptStateKind, download: (stateLabel: string) => void) => {
        openSave(kind, {
            submitLabel: kind === 'draft' ? 'Save draft and download' : 'Save version and download',
            afterSave: created => download(getScriptSnapshotLabel(created)),
        });
    }, [isReadOnly, openSave]);

    useDocumentTitle(currentScript ? `Export · ${fileTitle}` : 'Export');

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

                downloadStagistic(fileTitle, content);

                return;
            }

            if (actionId === 'export-stepkg' && currentScript) {
                setIsPreparingPackage(true);
                void new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
                    .then(() => exportScriptPackage({
                        repository,
                        scriptId: currentScript.id,
                        generator: {name: 'Stagistic', version: 'web'},
                    }))
                    .then(result => {
                        if (result.ok) {
                            downloadBlob(result.fileName, result.blob);
                        }
                    })
                    .catch(() => undefined)
                    .finally(() => setIsPreparingPackage(false));
            }
        },
        [
            openAttributeManagerModal,
            openSettingsModal,
            script,
            scriptTitleDraft,
            currentScript,
            fileTitle,
            repository,
        ],
    );

    return (
        <AppLayout
            header={
                currentScript ? (
                    <ScriptEditorAppHeader
                        currentScript={{...currentScript, name: shownTitle}}
                        onMenuAction={handleMenuAction}
                        onRenameScript={isReadOnly ? undefined : updateScriptTitle}
                        activeView="export"
                        scriptState={scriptStateControls.stateMenu}
                    />
                ) : null
            }
        >
            {isPreparingPackage ? <LoaderOverlay variant="scrim" label="Preparing package" messages={[]} /> : null}
            {script ? (
                <ExportProvider
                    script={script}
                    settings={settings}
                    musicAttachments={musicAttachmentsState}
                    fileName={fileTitle}
                    saveAndDownload={saveAndDownload}
                >
                    <div className={styles.shell}>
                        <ExportControlPanel />
                        <ExportPreview />
                    </div>
                </ExportProvider>
            ) : (
                <div className={styles.placeholder}>No script loaded.</div>
            )}
            {scriptStateControls.modals}
        </AppLayout>
    );
};

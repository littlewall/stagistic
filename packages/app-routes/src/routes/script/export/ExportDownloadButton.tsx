import {
    Button,
    ChevronDownIcon,
    IconDropdownMenu,
} from '@stagistic/ui';

import {sanitizeFileName} from '../../../shared/downloadStagistic';
import {useSaveFile, useSaveWording} from '../../../shared/saveFile';
import styles from './ExportPreview.module.css';
import {useExportContext} from './ExportProvider';

export const ExportDownloadButton = () => {
    const {
        artifact,
        canExport,
        script,
        fileName,
        saveAndDownload,
    } = useExportContext();
    const saveFile = useSaveFile();
    const wording = useSaveWording();
    const isDisabled = !canExport || !artifact;

    const download = (stateLabel?: string) => {
        if (!artifact) {
            return;
        }

        const baseName = fileName ?? script.scriptTitle;

        void saveFile({
            data: artifact,
            suggestedName: `${sanitizeFileName(stateLabel ? `${baseName} – ${stateLabel}` : baseName)}.pdf`,
        });
    };

    const button = (
        <Button
            type="button"
            size="sm"
            onPress={() => download()}
            isDisabled={isDisabled}
        >
            {wording.pdfButton}
        </Button>
    );

    if (!saveAndDownload || isDisabled) {
        return button;
    }

    return (
        <span className={styles.downloadGroup}>
            {button}
            <IconDropdownMenu
                aria-label={wording.pdfMoreOptions}
                icon={<ChevronDownIcon aria-hidden="true" />}
                size="sm"
                items={[{id: 'draft', label: wording.stateMenuItem('draft')}, {id: 'version', label: wording.stateMenuItem('version')}]}
                onAction={id => saveAndDownload(id === 'version' ? 'version' : 'draft', download)}
            />
        </span>
    );
};

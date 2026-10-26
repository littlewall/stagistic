import {
    Button,
    ChevronDownIcon,
    IconDropdownMenu,
} from '@stagistic/ui';

import styles from './ExportPreview.module.css';
import {useExportContext} from './ExportProvider';

const SAVE_AND_DOWNLOAD_ITEMS = [{id: 'draft', label: 'Save as draft and download…'}, {id: 'version', label: 'Save as version and download…'}];

const sanitizeFileName = (value: string) => {
    const normalized = value
        .trim()
        // Control chars are intentionally stripped from file names.
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
        .replace(/[. ]+$/u, '');

    return normalized || 'Untitled';
};

export const ExportDownloadButton = () => {
    const {
        artifact,
        canExport,
        script,
        fileName,
        saveAndDownload,
    } = useExportContext();
    const isDisabled = !canExport || !artifact;

    const download = (stateLabel?: string) => {
        if (!artifact) {
            return;
        }

        const baseName = fileName ?? script.scriptTitle;

        const url = URL.createObjectURL(artifact);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${sanitizeFileName(stateLabel ? `${baseName} – ${stateLabel}` : baseName)}.pdf`;
        anchor.style.display = 'none';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const button = (
        <Button
            type="button"
            size="sm"
            onPress={() => download()}
            isDisabled={isDisabled}
        >
            Download PDF
        </Button>
    );

    if (!saveAndDownload || isDisabled) {
        return button;
    }

    return (
        <span className={styles.downloadGroup}>
            {button}
            <IconDropdownMenu
                aria-label="More download options"
                icon={<ChevronDownIcon aria-hidden="true" />}
                size="sm"
                items={SAVE_AND_DOWNLOAD_ITEMS}
                onAction={id => saveAndDownload(id === 'version' ? 'version' : 'draft', download)}
            />
        </span>
    );
};

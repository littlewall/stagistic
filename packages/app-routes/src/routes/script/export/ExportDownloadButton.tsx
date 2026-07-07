import {Button} from '@stagistic/ui';

import {useExportContext} from './ExportProvider';

const sanitizeFileName = (value: string) => {
    const normalized = value
        .trim()
        .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
        .replace(/[. ]+$/u, '');

    return normalized || 'Untitled';
};

export const ExportDownloadButton = () => {
    const {artifact, script} = useExportContext();

    const download = () => {
        if (!artifact) {
            return;
        }

        const url = URL.createObjectURL(artifact);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${sanitizeFileName(script.scriptTitle)}.pdf`;
        anchor.style.display = 'none';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <Button
            type="button"
            size="sm"
            onPress={download}
            isDisabled={!artifact}
        >
            Download PDF
        </Button>
    );
};

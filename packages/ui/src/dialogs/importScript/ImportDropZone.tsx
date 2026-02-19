import {
    DropZone,
    FileTrigger,
    Text,
} from 'react-aria-components';

import styles from '../ImportScriptModal.module.css';
import type {ImportDropZoneProps} from './types';

export const ImportDropZone = ({
    fileLabel,
    onDrop,
    onFileSelect,
    onPickFile,
}: ImportDropZoneProps) => {
    if (onPickFile) {
        return (
            <DropZone
                className={styles.dropZone}
                getDropOperation={() => 'copy'}
                onDrop={onDrop}
                onClick={onPickFile}
            >
                <Text slot="label" className={styles.dropZoneLabel}>
                    {fileLabel}
                </Text>
                <Text slot="description" className={styles.dropZoneHint}>
                    Drop a .fountain file or click to browse.
                </Text>
            </DropZone>
        );
    }

    return (
        <FileTrigger
            acceptedFileTypes={['.fountain']}
            onSelect={onFileSelect}
        >
            <DropZone
                className={styles.dropZone}
                getDropOperation={() => 'copy'}
                onDrop={onDrop}
            >
                <Text slot="label" className={styles.dropZoneLabel}>
                    {fileLabel}
                </Text>
                <Text slot="description" className={styles.dropZoneHint}>
                    Drop a .fountain file or click to browse.
                </Text>
            </DropZone>
        </FileTrigger>
    );
};

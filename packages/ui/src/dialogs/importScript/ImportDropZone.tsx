import {
    Button,
    DropZone,
    FileTrigger,
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
            >
                <Button
                    className={styles.dropZoneTrigger}
                    onPress={() => { void onPickFile(); }}
                >
                    <span className={styles.dropZoneLabel}>{fileLabel}</span>
                    <span className={styles.dropZoneHint}>Drop a .fountain file or click to browse.</span>
                </Button>
            </DropZone>
        );
    }

    return (
        <DropZone
            className={styles.dropZone}
            getDropOperation={() => 'copy'}
            onDrop={onDrop}
        >
            <FileTrigger
                acceptedFileTypes={['.fountain']}
                onSelect={onFileSelect}
            >
                <Button className={styles.dropZoneTrigger}>
                    <span className={styles.dropZoneLabel}>{fileLabel}</span>
                    <span className={styles.dropZoneHint}>Drop a .fountain file or click to browse.</span>
                </Button>
            </FileTrigger>
        </DropZone>
    );
};

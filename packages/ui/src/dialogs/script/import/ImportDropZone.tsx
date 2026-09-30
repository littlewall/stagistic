import {useRef} from 'react';
import {
    Button,
    FileTrigger,
    useDrop,
} from 'react-aria-components';

import styles from '../ImportScriptModal.module.css';
import type {ImportDropZoneProps} from './types';

export const ImportDropZone = ({
    fileLabel,
    hint,
    isFileSelected = false,
    acceptedExtensions,
    onDrop,
    onFileSelect,
    onPickFile,
}: ImportDropZoneProps) => {
    const dropZoneRef = useRef<HTMLDivElement | null>(null);
    const {dropProps, isDropTarget} = useDrop({
        ref: dropZoneRef,
        getDropOperation: () => 'copy',
        onDrop,
    });
    const dropZoneProps = {
        ...dropProps,
        className: styles.dropZone,
        'data-drop-target': isDropTarget || undefined,
    };

    if (onPickFile) {
        return (
            <div
                {...dropZoneProps}
                ref={dropZoneRef}
            >
                <Button
                    className={styles.dropZoneTrigger}
                    onPress={() => {
                        void onPickFile();
                    }}
                >
                    <span className={styles.dropZoneLabel}>{fileLabel}</span>
                    <span
                        className={styles.dropZoneHint}
                        data-selected={isFileSelected || undefined}
                    >
                        {hint}
                    </span>
                </Button>
            </div>
        );
    }

    return (
        <div
            {...dropZoneProps}
            ref={dropZoneRef}
        >
            <FileTrigger
                acceptedFileTypes={[...acceptedExtensions]}
                onSelect={onFileSelect}
            >
                <Button className={styles.dropZoneTrigger}>
                    <span className={styles.dropZoneLabel}>{fileLabel}</span>
                    <span
                        className={styles.dropZoneHint}
                        data-selected={isFileSelected || undefined}
                    >
                        {hint}
                    </span>
                </Button>
            </FileTrigger>
        </div>
    );
};

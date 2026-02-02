import {
    type ChangeEvent,
    type FormEvent,
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    DropZone, FileTrigger, Text,
} from 'react-aria-components';

import styles from './ImportScriptModal.module.css';

type ImportScriptModalProps = {
    isOpen: boolean,
    onClose: () => void,
    onImport: (payload: {
        name: string,
        fileName: string,
        text: string,
    }) => void,
    onPickFile?: () => Promise<{fileName: string, text: string} | null>,
    preselectedFile?: {fileName: string, text: string} | null,
};

type DropItem = {
    kind: string,
    getFile: () => Promise<File>,
};

type DropEvent = {
    items: DropItem[],
};

const isFountainFileName = (name: string) => name.toLowerCase().endsWith('.fountain');
const getFileBaseName = (name: string) => name.replace(/\.fountain$/i, '');

type SelectedFile = {
    name: string,
    file?: File,
    text?: string,
};

export const ImportScriptModal = ({
    isOpen,
    onClose,
    onImport,
    onPickFile,
    preselectedFile,
}: ImportScriptModalProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setSelectedFile(null);
            setFileError(null);

            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !preselectedFile) {
            return;
        }

        setSelectedFile({
            name: preselectedFile.fileName,
            text: preselectedFile.text,
        });
        setFileError(null);

        if (name.trim() === '') {
            setName(getFileBaseName(preselectedFile.fileName));
        }
    }, [
        isOpen,
        name,
        preselectedFile,
    ]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const fileLabel = useMemo(() => {
        if (!selectedFile) {
            return 'Drop your .fountain file here';
        }

        return selectedFile.name;
    }, [selectedFile]);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedFile) {
            setFileError('Please drop a .fountain file first.');

            return;
        }

        const fileText = selectedFile.text ?? (selectedFile.file
            ? await selectedFile.file.text()
            : null);

        if (!fileText) {
            setFileError('Please drop a .fountain file first.');

            return;
        }

        setFileError(null);
        onImport({
            name,
            fileName: selectedFile.name,
            text: fileText,
        });
    }, [
        name,
        onImport,
        selectedFile,
    ]);

    const handleBackdropClick = useCallback(() => {
        onClose();
    }, [onClose]);

    const handleModalClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleDrop = useCallback(async (event: DropEvent) => {
        const item = event.items.find(current => current.kind === 'file');

        if (!item || item.kind !== 'file') {
            setFileError('Please drop a .fountain file.');

            return;
        }

        const file = await item.getFile();

        if (!isFountainFileName(file.name)) {
            setFileError('Only .fountain files are supported.');
            setSelectedFile(null);

            return;
        }

        setSelectedFile({
            name: file.name,
            file,
        });
        setFileError(null);

        if (name.trim() === '') {
            setName(getFileBaseName(file.name));
        }
    }, [name]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }

        const file = files[0];

        if (!file || !isFountainFileName(file.name)) {
            setFileError('Only .fountain files are supported.');
            setSelectedFile(null);

            return;
        }

        setSelectedFile({
            name: file.name,
            file,
        });
        setFileError(null);

        if (name.trim() === '') {
            setName(getFileBaseName(file.name));
        }
    }, [name]);

    const handlePickFile = useCallback(async () => {
        if (!onPickFile) {
            return;
        }

        try {
            const picked = await onPickFile();

            if (!picked) {
                return;
            }

            setSelectedFile({
                name: picked.fileName,
                text: picked.text,
            });
            setFileError(null);

            if (name.trim() === '') {
                setName(getFileBaseName(picked.fileName));
            }
        } catch (error) {
            console.error('Failed to pick file', error);
            setFileError('Failed to open the file picker.');
        }
    }, [name, onPickFile]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className={styles.backdrop}
            role="presentation"
            onClick={handleBackdropClick}
        >
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-label="Import script"
                onClick={handleModalClick}
            >
                <h2 className={styles.title}>Import script</h2>
                <p className={styles.subtitle}>
                    Bring in a Fountain file and keep working where you left off.
                </p>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.label} htmlFor="import-script-name">
                        Script name
                    </label>
                    <input
                        id="import-script-name"
                        ref={inputRef}
                        className={styles.input}
                        value={name}
                        onChange={handleNameChange}
                        placeholder="Untitled scenario"
                    />
                    {onPickFile ? (
                        <DropZone
                            className={styles.dropZone}
                            getDropOperation={() => 'copy'}
                            onDrop={handleDrop}
                            onClick={handlePickFile}
                        >
                            <Text slot="label" className={styles.dropZoneLabel}>
                                {fileLabel}
                            </Text>
                            <Text slot="description" className={styles.dropZoneHint}>
                                Drop a .fountain file or click to browse.
                            </Text>
                        </DropZone>
                    ) : (
                        <FileTrigger
                            acceptedFileTypes={['.fountain']}
                            onSelect={handleFileSelect}
                        >
                            <DropZone
                                className={styles.dropZone}
                                getDropOperation={() => 'copy'}
                                onDrop={handleDrop}
                            >
                                <Text slot="label" className={styles.dropZoneLabel}>
                                    {fileLabel}
                                </Text>
                                <Text slot="description" className={styles.dropZoneHint}>
                                    Drop a .fountain file or click to browse.
                                </Text>
                            </DropZone>
                        </FileTrigger>
                    )}
                    {fileError ? (
                        <p className={styles.error} role="alert">
                            {fileError}
                        </p>
                    ) : null}
                    <div className={styles.actions}>
                        <button
                            className={styles.ghostButton}
                            type="button"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className={styles.primaryButton}
                            type="submit"
                            disabled={!selectedFile}
                        >
                            Import script
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

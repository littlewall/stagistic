import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    type DropEvent,
    getFileBaseName,
    type ImportPayload,
    isFileDropItem,
    isFountainFileName,
    type SelectedFile,
} from './model';

type UseImportScriptModalStateArgs = {
    isOpen: boolean,
    onClose: () => void,
    onImport: (payload: ImportPayload) => void,
    onPickFile?: () => Promise<{fileName: string, text: string} | null>,
    preselectedFile?: {fileName: string, text: string} | null,
};

export const useImportScriptModalState = ({
    isOpen,
    onClose,
    onImport,
    onPickFile,
    preselectedFile,
}: UseImportScriptModalStateArgs) => {
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
        setName(previous => {
            if (previous.trim() === '') {
                return getFileBaseName(preselectedFile.fileName);
            }

            return previous;
        });
    }, [isOpen, preselectedFile]);

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

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleDrop = useCallback(async (event: DropEvent) => {
        const item = event.items.find(isFileDropItem);

        if (!item) {
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
        setName(previous => {
            if (previous.trim() === '') {
                return getFileBaseName(file.name);
            }

            return previous;
        });
    }, []);

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
        setName(previous => {
            if (previous.trim() === '') {
                return getFileBaseName(file.name);
            }

            return previous;
        });
    }, []);

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
            setName(previous => {
                if (previous.trim() === '') {
                    return getFileBaseName(picked.fileName);
                }

                return previous;
            });
        } catch (error) {
            console.error('Failed to pick file', error);
            setFileError('Failed to open the file picker.');
        }
    }, [onPickFile]);

    return {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
    };
};

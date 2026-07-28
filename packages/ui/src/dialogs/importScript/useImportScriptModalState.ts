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
    isFileDropItem,
    isStagisticFileName,
    type SelectedFile,
} from './model';
import type {UseImportScriptModalStateArgs} from './types';

export const useImportScriptModalState = ({
    isOpen,
    onImport,
    onPickFile,
    preselectedFile,
}: UseImportScriptModalStateArgs) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setSelectedFile(null);
            setFileError(null);
            setIsProcessing(false);

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

    const fileLabel = useMemo(() => {
        if (!selectedFile) {
            return 'Drop your .stagistic file here';
        }

        return selectedFile.name;
    }, [selectedFile]);

    const handleSubmit = useCallback(async (event: FormEvent) => {
        event.preventDefault();

        if (!selectedFile || isProcessing) {
            setFileError('Please drop a .stagistic file first.');

            return;
        }

        const fileText = selectedFile.text ?? (selectedFile.file
            ? await selectedFile.file.text()
            : null);

        if (!fileText) {
            setFileError('Please drop a .stagistic file first.');

            return;
        }

        setFileError(null);
        setIsProcessing(true);

        try {
            await onImport({
                name,
                fileName: selectedFile.name,
                text: fileText,
            });
        } finally {
            setIsProcessing(false);
        }
    }, [
        isProcessing,
        name,
        onImport,
        selectedFile,
    ]);

    const applyFile = useCallback((file: SelectedFile) => {
        setSelectedFile(file);
        setFileError(null);
        setName(previous => {
            if (previous.trim() === '') {
                return getFileBaseName(file.name);
            }

            return previous;
        });
    }, []);

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleDrop = useCallback(async (event: DropEvent) => {
        const item = event.items.find(isFileDropItem);

        if (!item) {
            setFileError('Please drop a .stagistic file.');

            return;
        }

        const file = await item.getFile();

        if (!isStagisticFileName(file.name)) {
            setFileError('Only .stagistic files are supported.');
            setSelectedFile(null);

            return;
        }

        applyFile({name: file.name, file});
    }, [applyFile]);

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }

        const file = files[0];

        if (!file || !isStagisticFileName(file.name)) {
            setFileError('Only .stagistic files are supported.');
            setSelectedFile(null);

            return;
        }

        applyFile({name: file.name, file});
    }, [applyFile]);

    const handlePickFile = useCallback(async () => {
        if (!onPickFile) {
            return;
        }

        try {
            const picked = await onPickFile();

            if (!picked) {
                return;
            }

            applyFile({name: picked.fileName, text: picked.text});
        } catch (error) {
            console.error('Failed to pick file', error);
            setFileError('Failed to open the file picker.');
        }
    }, [applyFile, onPickFile]);

    return {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        isProcessing,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
    };
};

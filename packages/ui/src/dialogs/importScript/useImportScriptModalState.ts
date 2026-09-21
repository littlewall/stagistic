import {type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {classifyFileKind, type DropEvent, getFileBaseName, isFileDropItem, type SelectedFile} from './model';
import type {StepkgPeekResult, UseImportScriptModalStateArgs} from './types';

const UNSUPPORTED_FILE_ERROR = 'Only .stagistic or .stepkg files are supported.';

export const useImportScriptModalState = ({
    isOpen,
    onImportStagistic,
    onImportStepkgAsNew,
    onReplaceWithStepkg,
    onDownloadStepkgBackup,
    onPeekStepkg,
    onPickFile,
    preselectedFile,
}: UseImportScriptModalStateArgs) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isPeeking, setIsPeeking] = useState(false);
    const [stepkgPeek, setStepkgPeek] = useState<StepkgPeekResult | null>(null);
    const [importChoice, setImportChoice] = useState<'new' | 'replace'>('new');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setSelectedFile(null);
            setFileError(null);
            setIsPeeking(false);
            setStepkgPeek(null);
            setImportChoice('new');
            setIsProcessing(false);
            setIsDownloadingBackup(false);

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

        setSelectedFile({kind: 'stagistic', name: preselectedFile.fileName, text: preselectedFile.text});
        setFileError(null);
        setStepkgPeek(null);
        setImportChoice('new');
        setName(previous => (previous.trim() === '' ? getFileBaseName(preselectedFile.fileName) : previous));
    }, [isOpen, preselectedFile]);

    const fileLabel = useMemo(() => {
        if (!selectedFile) {
            return 'Drop your .stagistic or .stepkg file here';
        }

        return selectedFile.name;
    }, [selectedFile]);

    const peekStepkg = useCallback(
        async (bytes: Uint8Array) => {
            setIsPeeking(true);

            try {
                const result = await onPeekStepkg(bytes);

                setIsPeeking(false);

                if (!result.ok) {
                    setFileError(result.message);
                    setStepkgPeek(null);

                    return;
                }

                setStepkgPeek(result);
                setImportChoice('new');
                setName(previous => (previous.trim() === '' ? result.packageTitle : previous));
            } catch {
                setIsPeeking(false);
                setFileError('Failed to read the package.');
                setStepkgPeek(null);
            }
        },
        [onPeekStepkg],
    );

    const applyStagisticFile = useCallback((file: {name: string; file?: File; text?: string}) => {
        setSelectedFile({kind: 'stagistic', ...file});
        setFileError(null);
        setStepkgPeek(null);
        setImportChoice('new');
        setName(previous => (previous.trim() === '' ? getFileBaseName(file.name) : previous));
    }, []);

    const applyStepkgFile = useCallback(
        (fileName: string, bytes: Uint8Array) => {
            setSelectedFile({kind: 'stepkg', name: fileName, bytes});
            setFileError(null);
            setStepkgPeek(null);
            void peekStepkg(bytes);
        },
        [peekStepkg],
    );

    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value);
    }, []);

    const handleDrop = useCallback(
        async (event: DropEvent) => {
            const item = event.items.find(isFileDropItem);

            if (!item) {
                setFileError('Please drop a .stagistic or .stepkg file.');

                return;
            }

            const file = await item.getFile();
            const kind = classifyFileKind(file.name);

            if (kind === 'stagistic') {
                applyStagisticFile({name: file.name, file});

                return;
            }

            if (kind === 'stepkg') {
                applyStepkgFile(file.name, new Uint8Array(await file.arrayBuffer()));

                return;
            }

            setFileError(UNSUPPORTED_FILE_ERROR);
            setSelectedFile(null);
        },
        [applyStagisticFile, applyStepkgFile],
    );

    const handleFileSelect = useCallback(
        (files: FileList | null) => {
            if (!files || files.length === 0) {
                return;
            }

            const file = files[0];
            const kind = file ? classifyFileKind(file.name) : null;

            if (!file || !kind) {
                setFileError(UNSUPPORTED_FILE_ERROR);
                setSelectedFile(null);

                return;
            }

            if (kind === 'stagistic') {
                applyStagisticFile({name: file.name, file});

                return;
            }

            void file.arrayBuffer().then(buffer => applyStepkgFile(file.name, new Uint8Array(buffer)));
        },
        [applyStagisticFile, applyStepkgFile],
    );

    const handlePickFile = useCallback(async () => {
        if (!onPickFile) {
            return;
        }

        try {
            const picked = await onPickFile();

            if (!picked) {
                return;
            }

            applyStagisticFile({name: picked.fileName, text: picked.text});
        } catch (error) {
            console.error('Failed to pick file', error);
            setFileError('Failed to open the file picker.');
        }
    }, [applyStagisticFile, onPickFile]);

    const handleChoiceChange = useCallback((choice: 'new' | 'replace') => {
        setImportChoice(choice);
    }, []);

    const showNameField =
        selectedFile?.kind === 'stagistic' ||
        (selectedFile?.kind === 'stepkg' && stepkgPeek?.ok === true && (stepkgPeek.existingLocalTitle === null || importChoice === 'new'));
    const showChoiceToggle = selectedFile?.kind === 'stepkg' && stepkgPeek?.ok === true && stepkgPeek.existingLocalTitle !== null;
    const showReplacePanel = showChoiceToggle && importChoice === 'replace';
    const canSubmitNew =
        !isProcessing &&
        !isPeeking &&
        ((selectedFile?.kind === 'stagistic' && Boolean(selectedFile.text || selectedFile.file)) ||
            (selectedFile?.kind === 'stepkg' && Boolean(selectedFile.bytes) && stepkgPeek?.ok === true && !showReplacePanel));

    const handleSubmit = useCallback(
        async (event: FormEvent) => {
            event.preventDefault();

            if (!selectedFile || isProcessing) {
                return;
            }

            if (selectedFile.kind === 'stepkg' && showReplacePanel) {
                return;
            }

            if (selectedFile.kind === 'stagistic') {
                const fileText = selectedFile.text ?? (selectedFile.file ? await selectedFile.file.text() : null);

                if (!fileText) {
                    setFileError('Please drop a .stagistic file first.');

                    return;
                }

                setFileError(null);
                setIsProcessing(true);

                try {
                    await onImportStagistic({name, fileName: selectedFile.name, text: fileText});
                } finally {
                    setIsProcessing(false);
                }

                return;
            }

            if (!selectedFile.bytes) {
                setFileError('Please drop a .stepkg file first.');

                return;
            }

            setFileError(null);
            setIsProcessing(true);

            try {
                await onImportStepkgAsNew({fileName: selectedFile.name, bytes: selectedFile.bytes, title: name});
            } finally {
                setIsProcessing(false);
            }
        },
        [isProcessing, name, onImportStagistic, onImportStepkgAsNew, selectedFile, showReplacePanel],
    );

    const handleReplaceConfirm = useCallback(async () => {
        if (!selectedFile || selectedFile.kind !== 'stepkg' || !selectedFile.bytes || isProcessing) {
            return;
        }

        setIsProcessing(true);

        try {
            await onReplaceWithStepkg({fileName: selectedFile.name, bytes: selectedFile.bytes});
        } finally {
            setIsProcessing(false);
        }
    }, [isProcessing, onReplaceWithStepkg, selectedFile]);

    const handleDownloadBackup = useCallback(async () => {
        if (!stepkgPeek?.ok || isDownloadingBackup) {
            return;
        }

        setIsDownloadingBackup(true);

        try {
            await onDownloadStepkgBackup(stepkgPeek.scriptId);
        } finally {
            setIsDownloadingBackup(false);
        }
    }, [isDownloadingBackup, onDownloadStepkgBackup, stepkgPeek]);

    return {
        inputRef,
        name,
        selectedFile,
        fileLabel,
        fileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        isProcessing,
        isDownloadingBackup,
        showNameField,
        showChoiceToggle,
        showReplacePanel,
        canSubmitNew,
        handleSubmit,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
        handleChoiceChange,
        handleReplaceConfirm,
        handleDownloadBackup,
    };
};

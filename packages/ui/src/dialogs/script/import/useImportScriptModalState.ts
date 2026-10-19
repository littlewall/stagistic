import {
    type FormEvent,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {SelectedFile} from './model';
import type {StepkgPeekResult, UseImportScriptModalStateArgs} from './types';
import {useImportFileSelection} from './useImportFileSelection';

const getImportAvailability = (
    selectedFile: SelectedFile | null,
    stepkgPeek: StepkgPeekResult | null,
    importChoice: 'new' | 'replace',
    isProcessing: boolean,
    isPeeking: boolean,
) => {
    if (selectedFile?.kind === 'stagistic') {
        return {
            showNameField: true,
            showChoiceToggle: false,
            showReplacePanel: false,
            canSubmitNew: !isProcessing && !isPeeking && Boolean(selectedFile.text || selectedFile.file),
        };
    }

    if (selectedFile?.kind !== 'stepkg' || !stepkgPeek?.ok) {
        return {
            showNameField: false,
            showChoiceToggle: false,
            showReplacePanel: false,
            canSubmitNew: false,
        };
    }

    const showChoiceToggle = stepkgPeek.existingLocalTitle !== null;
    const showReplacePanel = showChoiceToggle && importChoice === 'replace';

    return {
        showNameField: !showChoiceToggle || importChoice === 'new',
        showChoiceToggle,
        showReplacePanel,
        canSubmitNew: !isProcessing && !isPeeking && Boolean(selectedFile.bytes) && !showReplacePanel,
    };
};

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
    const {
        name,
        selectedFile,
        fileLabel,
        fileError,
        setFileError,
        isPeeking,
        stepkgPeek,
        importChoice,
        handleNameChange,
        handleDrop,
        handleFileSelect,
        handlePickFile,
        handleChoiceChange,
    } = useImportFileSelection({
        isOpen,
        onPeekStepkg,
        onPickFile,
        preselectedFile,
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

    const [wasOpen, setWasOpen] = useState(isOpen);

    if (wasOpen !== isOpen) {
        setWasOpen(isOpen);
        if (!isOpen) {
            setIsProcessing(false);
            setIsDownloadingBackup(false);
        }
    }

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [isOpen]);

    const {
        showNameField,
        showChoiceToggle,
        showReplacePanel,
        canSubmitNew,
    } = getImportAvailability(selectedFile, stepkgPeek, importChoice, isProcessing, isPeeking);

    const handleSubmit = async (event: FormEvent) => {
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
                await onImportStagistic({
                    name,
                    fileName: selectedFile.name,
                    text: fileText,
                });
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
            await onImportStepkgAsNew({
                fileName: selectedFile.name,
                bytes: selectedFile.bytes,
                title: name,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReplaceConfirm = async () => {
        if (!selectedFile || selectedFile.kind !== 'stepkg' || !selectedFile.bytes || isProcessing) {
            return;
        }

        setIsProcessing(true);

        try {
            await onReplaceWithStepkg({fileName: selectedFile.name, bytes: selectedFile.bytes});
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadBackup = async () => {
        if (!stepkgPeek?.ok || isDownloadingBackup) {
            return;
        }

        setIsDownloadingBackup(true);

        try {
            await onDownloadStepkgBackup(stepkgPeek.scriptId);
        } finally {
            setIsDownloadingBackup(false);
        }
    };

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

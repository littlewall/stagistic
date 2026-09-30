import {
    type ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    classifyFileKind,
    type DropEvent,
    getFileBaseName,
    isFileDropItem,
    type SelectedFile,
} from './model';
import type {StepkgPeekResult, UseImportScriptModalStateArgs} from './types';

const UNSUPPORTED_FILE_ERROR = 'Only .stagistic or .stepkg files are supported.';

type UseImportFileSelectionArgs = Pick<UseImportScriptModalStateArgs, 'isOpen' | 'onPeekStepkg' | 'onPickFile' | 'preselectedFile'>;

/** Selected file, its .stepkg peek result, and the name/choice the user derives from it. */
export const useImportFileSelection = ({
    isOpen,
    onPeekStepkg,
    onPickFile,
    preselectedFile,
}: UseImportFileSelectionArgs) => {
    const [name, setName] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isPeeking, setIsPeeking] = useState(false);
    const [stepkgPeek, setStepkgPeek] = useState<StepkgPeekResult | null>(null);
    const [importChoice, setImportChoice] = useState<'new' | 'replace'>('new');

    useEffect(() => {
        if (isOpen) {
            return;
        }

        setName('');
        setSelectedFile(null);
        setFileError(null);
        setIsPeeking(false);
        setStepkgPeek(null);
        setImportChoice('new');
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !preselectedFile) {
            return;
        }

        setSelectedFile({
            kind: 'stagistic',
            name: preselectedFile.fileName,
            text: preselectedFile.text,
        });
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

    const applyStagisticFile = useCallback((file: {
        name: string,
        file?: File,
        text?: string,
    }) => {
        setSelectedFile({kind: 'stagistic', ...file});
        setFileError(null);
        setStepkgPeek(null);
        setImportChoice('new');
        setName(previous => (previous.trim() === '' ? getFileBaseName(file.name) : previous));
    }, []);

    const applyStepkgFile = useCallback(
        (fileName: string, bytes: Uint8Array) => {
            setSelectedFile({
                kind: 'stepkg',
                name: fileName,
                bytes,
            });
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

    return {
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
    };
};

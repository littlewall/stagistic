import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
} from 'react';

export interface SaveFileRequest {
    /** File content; a Blob keeps its MIME type for the web download. */
    data: Blob | Uint8Array,
    /** Name offered to the writer, extension included. */
    suggestedName: string,
}

/**
 * Hands a file to the writer. Resolves once saved or when the writer cancels
 * (cancel is not an error); rejects only when saving failed.
 */
export type SaveFile = (request: SaveFileRequest) => Promise<void>;

/** Web: a browser download through a temporary anchor. */
export const saveFileWithAnchor: SaveFile = ({data, suggestedName}) => {
    const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = suggestedName;
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // The browser has started reading the file by the next task.
    setTimeout(() => URL.revokeObjectURL(url), 0);

    return Promise.resolve();
};

const SaveFileContext = createContext<SaveFile>(saveFileWithAnchor);

/** Verb for file actions: a Save dialog (Mac app) or a browser download (web). */
export type SaveVerb = 'Save' | 'Download';

const SaveVerbContext = createContext<SaveVerb>('Download');

/** Provided once per Surface; without a provider downloads use the browser. */
export const SaveFileProvider = ({
    saveFile,
    verb = 'Download',
    children,
}: {
    saveFile: SaveFile,
    verb?: SaveVerb,
    children: ReactNode,
}) => (
    <SaveFileContext.Provider value={saveFile}>
        <SaveVerbContext.Provider value={verb}>{children}</SaveVerbContext.Provider>
    </SaveFileContext.Provider>
);

export const useSaveFile = () => useContext(SaveFileContext);

export const useSaveVerb = () => useContext(SaveVerbContext);

/** Every user-facing string of a file action; the one place the Surfaces differ. */
export const getSaveWording = (verb: SaveVerb) => {
    const isSave = verb === 'Save';

    return {
        verb,
        pdfButton: `${verb} PDF`,
        pdfMoreOptions: `More ${verb.toLowerCase()} options`,
        backupButton: `${verb} backup`,
        stateMenuItem: (kind: 'draft' | 'version') => (isSave ? `Save ${kind} and PDF…` : `Save as ${kind} and download…`),
        stateSubmit: (kind: 'draft' | 'version') => (isSave ? `Save ${kind} and PDF` : `Save ${kind} and download`),
    };
};

export const useSaveWording = () => {
    const verb = useSaveVerb();

    return useMemo(() => getSaveWording(verb), [verb]);
};

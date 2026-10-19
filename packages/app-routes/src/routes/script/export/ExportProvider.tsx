import type {ScriptData} from '@stagistic/export';
import type {EditorSettings} from '@stagistic/script';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from 'react';

import type {MusicAttachmentsState} from '../attribute-manager/useMusicAttachmentsState';

export type SaveScriptStateKind = 'draft' | 'version';
import {hasExportableScriptContent} from './hasExportableScriptContent';

export type ExportStatus = 'idle' | 'regenerating' | 'error';

interface ExportContextValue {
    script: ScriptData,
    settings: EditorSettings,
    artifact: Blob | null,
    canExport: boolean,
    status: ExportStatus,
    setArtifact: (artifact: Blob | null) => void,
    setStatus: (status: ExportStatus) => void,
    musicAttachments: MusicAttachmentsState | null,
    /** PDF file name without extension; defaults to the script title. */
    fileName: string | null,
    /** Stores the current script as a draft or version, then downloads it under that state's label. Absent for a saved state. */
    saveAndDownload: ((kind: SaveScriptStateKind, download: (stateLabel: string) => void) => void) | null,
}

const ExportContext = createContext<ExportContextValue | null>(null);

export const useExportContext = (): ExportContextValue => {
    const context = useContext(ExportContext);

    if (!context) {
        throw new Error('useExportContext must be used inside ExportProvider');
    }

    return context;
};

export const ExportProvider = ({
    script,
    settings,
    musicAttachments = null,
    fileName = null,
    saveAndDownload = null,
    children,
}: {
    script: ScriptData,
    settings: EditorSettings,
    musicAttachments?: MusicAttachmentsState | null,
    fileName?: string | null,
    saveAndDownload?: ExportContextValue['saveAndDownload'],
    children: ReactNode,
}) => {
    const [artifact, setArtifact] = useState<Blob | null>(null);
    const [status, setStatus] = useState<ExportStatus>('idle');
    const canExport = useMemo(() => hasExportableScriptContent(script.doc), [script.doc]);

    const value = useMemo<ExportContextValue>(() => ({
        script,
        settings,
        artifact,
        canExport,
        status,
        setArtifact,
        setStatus,
        musicAttachments,
        fileName,
        saveAndDownload,
    }), [
        artifact,
        canExport,
        fileName,
        saveAndDownload,
        script,
        settings,
        musicAttachments,
        status,
    ]);

    return (
        <ExportContext.Provider value={value}>
            {children}
        </ExportContext.Provider>
    );
};

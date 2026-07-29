import type {ScriptData} from '@stagistic/export';
import type {EditorSettings} from '@stagistic/script';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from 'react';

import type {MusicAttachmentsState} from '../attributes/useMusicAttachmentsState';
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
    children,
}: {
    script: ScriptData,
    settings: EditorSettings,
    musicAttachments?: MusicAttachmentsState | null,
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
    }), [
        artifact,
        canExport,
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

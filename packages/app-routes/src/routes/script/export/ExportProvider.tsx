import type {ScriptData} from '@stagistic/export';
import type {EditorSettings} from '@stagistic/script';
import {
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from 'react';

export type ExportStatus = 'idle' | 'regenerating' | 'error';

interface ExportContextValue {
    script: ScriptData,
    settings: EditorSettings,
    artifact: Blob | null,
    status: ExportStatus,
    setArtifact: (artifact: Blob | null) => void,
    setStatus: (status: ExportStatus) => void,
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
    children,
}: {
    script: ScriptData,
    settings: EditorSettings,
    children: ReactNode,
}) => {
    const [artifact, setArtifact] = useState<Blob | null>(null);
    const [status, setStatus] = useState<ExportStatus>('idle');

    const value = useMemo<ExportContextValue>(() => ({
        script,
        settings,
        artifact,
        status,
        setArtifact,
        setStatus,
    }), [
        artifact,
        script,
        settings,
        status,
    ]);

    return (
        <ExportContext.Provider value={value}>
            {children}
        </ExportContext.Provider>
    );
};

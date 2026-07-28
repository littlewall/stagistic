import {type useScriptRepository} from '@stagistic/app-core';
import {
    type EditorSettings, type ScriptBlockIndexSnapshot, type ScriptDocument,
} from '@stagistic/script';
import {
    createContext, type ReactNode, useContext,
} from 'react';

type ScriptRepository = ReturnType<typeof useScriptRepository>;

export interface ScriptSessionContextValue {
    currentScriptId: string | null,
    scriptRepository: ScriptRepository,
    resolvedScriptSettings: EditorSettings,
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    handleAutoSave: (value: ScriptDocument) => Promise<boolean>,
}

const ScriptSessionContext = createContext<ScriptSessionContextValue | null>(null);

export const ScriptSessionProvider = ({
    value,
    children,
}: {
    value: ScriptSessionContextValue,
    children: ReactNode,
}) => (
    <ScriptSessionContext.Provider value={value}>
        {children}
    </ScriptSessionContext.Provider>
);

export const useScriptSession = (): ScriptSessionContextValue => {
    const context = useContext(ScriptSessionContext);

    if (!context) {
        throw new Error('useScriptSession must be used inside ScriptSessionProvider');
    }

    return context;
};

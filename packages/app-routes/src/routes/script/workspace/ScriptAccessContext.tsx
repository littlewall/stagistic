import {
    type ScriptRepository,
    type ScriptSnapshot,
    useScriptRepository,
} from '@stagistic/app-core';
import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

/**
 * Which state of the script the workspace shows. The current script is
 * editable; a stored draft or version is read-only everywhere.
 */
export interface ScriptAccess {
    isReadOnly: boolean,
    /** The stored draft or version on screen; null for the current script. */
    snapshot: ScriptSnapshot | null,
    /** Repository of the current script, also while a snapshot is on screen. */
    liveRepository: ScriptRepository,
    /** Title of the current script; a snapshot keeps the title it was saved with. */
    liveScriptTitle: string | null,
    /** Route prefix of the shown state, e.g. /script/:id or /script/:id/snapshots/:snapshotId. */
    basePath: string | null,
}

const ScriptAccessContext = createContext<ScriptAccess | null>(null);

export const ScriptAccessProvider = ({
    value,
    children,
}: {
    value: ScriptAccess,
    children: ReactNode,
}) => (
    <ScriptAccessContext.Provider value={value}>
        {children}
    </ScriptAccessContext.Provider>
);

/**
 * Read-only flag and shown snapshot for panels and dialogs. Unlike
 * useScriptAccess it needs no repository provider, so isolated panels work.
 */
export const useScriptReadOnlyState = (): Pick<ScriptAccess, 'isReadOnly' | 'snapshot' | 'basePath'> => {
    const context = useContext(ScriptAccessContext);

    return {
        isReadOnly: context?.isReadOnly ?? false,
        snapshot: context?.snapshot ?? null,
        basePath: context?.basePath ?? null,
    };
};

/** Outside a script workspace this reports the editable current state. */
export const useScriptAccess = (): ScriptAccess => {
    const context = useContext(ScriptAccessContext);
    const repository = useScriptRepository();

    return context ?? {
        isReadOnly: false,
        snapshot: null,
        liveRepository: repository,
        liveScriptTitle: null,
        basePath: null,
    };
};

export const getScriptBasePath = (scriptId: string, snapshotId?: string | null) => {
    return snapshotId ? `/script/${scriptId}/snapshots/${snapshotId}` : `/script/${scriptId}`;
};

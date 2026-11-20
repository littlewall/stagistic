import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
} from 'react';

import {alwaysEditingLocks} from './alwaysEditingLocks';
import type {ScriptEditingLocks, ScriptEditingSession} from './types';

const ScriptEditingLocksContext = createContext<ScriptEditingLocks>(alwaysEditingLocks);
const ScriptEditingSessionContext = createContext<ScriptEditingSession | null>(null);

/** Without a provider every script is editable (desktop: one window). */
export const ScriptEditingLocksProvider = ({locks, children}: {locks: ScriptEditingLocks, children: ReactNode}) => (
    <ScriptEditingLocksContext value={locks}>{children}</ScriptEditingLocksContext>
);

/** The tab's session for a script, kept (and its lock held) while the calling view is mounted. */
export const useScriptEditingSessionOpener = (scriptId: string | undefined): ScriptEditingSession | null => {
    const locks = useContext(ScriptEditingLocksContext);
    const session = useMemo(() => scriptId ? locks.session(scriptId) : null, [locks, scriptId]);

    useEffect(() => session?.retain(), [session]);

    return session;
};

/** Runs `run` only while this tab may edit the script; `{ran: false}` when another tab edits it. */
export const useRunExclusiveOnScript = () => {
    const locks = useContext(ScriptEditingLocksContext);

    return locks.runExclusive;
};

export const ScriptEditingSessionProvider = ({session, children}: {session: ScriptEditingSession, children: ReactNode}) => (
    <ScriptEditingSessionContext value={session}>{children}</ScriptEditingSessionContext>
);

/** The open script's editing session; null outside a live script workspace. */
export const useScriptEditingSession = () => useContext(ScriptEditingSessionContext);

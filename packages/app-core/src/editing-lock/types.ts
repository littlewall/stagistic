/** Why a script is read-only in this tab. */
export type ScriptEditingReason =
    /** Another tab holds the edit lock. */
    | 'held-elsewhere'
    /** This tab gave editing to another tab on request. */
    | 'handed-over'
    /** Another tab took the lock while this one did not answer. */
    | 'lost'
    /** A save was refused because the script changed since this tab loaded it. */
    | 'refused';

export interface ScriptEditingState {
    role: 'acquiring' | 'editing' | 'read-only',
    reason: ScriptEditingReason | null,
    /** True while this tab waits for the editing tab to hand editing over. */
    isTakingOver: boolean,
    /** Changes whenever the text must be loaded again from the database. */
    loadEpoch: number,
    /** Text this tab could not save; the writer copies it by hand. Null when nothing is at risk. */
    rescueText: string | null,
}

/** What the open script offers so editing can leave this tab without losing text. */
export interface ScriptEditingParticipant {
    /** Stops edits and resolves true once everything typed reached the database. */
    flush: () => Promise<boolean>,
    /** True while typed text has not reached the database. */
    isDirty: () => boolean,
    getText: () => string,
}

/** One tab's view of who may edit one script's text. */
export interface ScriptEditingSession {
    getState: () => ScriptEditingState,
    subscribe: (listener: () => void) => () => void,
    /** Registers what is flushed when another tab asks for editing. */
    registerParticipant: (participant: ScriptEditingParticipant) => () => void,
    /** Asks the editing tab to hand over, then edits here; resolves once this tab holds the lock. */
    takeOver: () => Promise<void>,
    /** Loads the text again while staying read-only. */
    reload: () => void,
    /**
     * A save from this tab was refused: stop editing and keep the unsaved text for rescue.
     * Returns false when this tab no longer edits, so the caller reports an ordinary failure.
     */
    markRefused: () => boolean,
    dismissRescue: () => void,
    /**
     * Keeps the session's lock while a view uses it. The lock is let go one macrotask
     * after the last holder released, so a view that remounts at once keeps editing.
     */
    retain: () => () => void,
}

export type ExclusiveResult<T> = {ran: true, value: T} | {ran: false};

export interface ScriptEditingLocks {
    /** The tab's one session for a script; creating it takes nothing until it is retained. */
    session: (scriptId: string) => ScriptEditingSession,
    /** Runs `run` only while this tab may edit the script; `{ran: false}` when another tab does. */
    runExclusive: <T>(scriptId: string, run: () => Promise<T>) => Promise<ExclusiveResult<T>>,
}

/*
 * Anything that holds text the database has not received yet (a document being
 * typed, a title or settings draft) sets a mark here, so code that must not
 * lose it, such as a quiet reload, can ask without knowing who owns the work.
 */
const marks = new Set<symbol>();

/** What a handover to a newer version needs from an owner that cannot enrol itself (mirrors `DatabaseHandoverParticipant`). */
export interface UnsavedWorkParticipant {
    flush: () => Promise<boolean>,
    stopEditing?: () => void,
    getText?: () => string,
}

const participants = new Set<UnsavedWorkParticipant>();

/** For owners without access to the database handover (UI components). Returns the remover. */
export const addUnsavedWorkParticipant = (participant: UnsavedWorkParticipant) => {
    participants.add(participant);

    return () => {
        participants.delete(participant);
    };
};

export const getUnsavedWorkParticipants = () => [...participants];

/** One mark per owner; call the returned function with the owner's current state. */
export const createUnsavedWorkMark = () => {
    const token = Symbol('unsaved-work');

    return (isUnsaved: boolean) => {
        if (isUnsaved) {
            marks.add(token);
        } else {
            marks.delete(token);
        }
    };
};

export const hasUnsavedWork = () => marks.size > 0;

// Structural, so this package needs no DOM types: pass `window`.
interface UnloadEvent {
    preventDefault: () => void,
    returnValue: string,
}

interface UnloadTarget {
    addEventListener: (type: 'beforeunload', listener: (event: UnloadEvent) => void) => void,
    removeEventListener: (type: 'beforeunload', listener: (event: UnloadEvent) => void) => void,
}

/**
 * The browser's native "leave site?" prompt, asked while any owner holds unsaved work.
 * One listener for the whole app. Desktop never prompts: its webview shows no such
 * dialog and a close request does not raise `beforeunload`, so a listener there could
 * only block a reload. Returns the function that removes it.
 */
export const installUnsavedWorkWarning = (target: UnloadTarget) => {
    const warn = (event: UnloadEvent) => {
        if (!hasUnsavedWork() || Reflect.get(globalThis, 'isTauri')) {
            return;
        }

        event.preventDefault();
        // Older browsers only prompt when returnValue is set.
        event.returnValue = '';
    };

    target.addEventListener('beforeunload', warn);

    return () => target.removeEventListener('beforeunload', warn);
};

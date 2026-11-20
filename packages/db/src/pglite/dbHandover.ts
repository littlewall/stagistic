import {sleep} from './dbGuard';

/*
 * The old tab's side of a handover: stop edits, save, wait for a durable write,
 * leave the database, ask for a reload. Until a newer generation asks, nothing
 * happens and the tab keeps working.
 *
 * When saving fails the tab keeps its worker and its lock, and the newer tab
 * keeps waiting: the text stays in this tab until the writer has copied it and
 * reloads or closes it.
 *
 * `database-lost` has nothing to do with a newer tab: this tab was to take over
 * the database and could not open it. Nothing can be saved from here any more,
 * so the text is all that is left to offer.
 */
export type DatabaseHandoverState =
    | {status: 'idle'}
    | {status: 'saving'}
    | {status: 'saved'}
    | {status: 'save-failed', text: string}
    | {status: 'database-lost', text: string};

/** Anything holding edits the database has not received yet. */
export interface DatabaseHandoverParticipant {
    /** Resolves true once everything reached the repository. */
    flush: () => Promise<boolean>,
    /** Called before saving, so nothing is typed after the last save. */
    stopEditing?: () => void,
    /** The writer's text, for copying by hand when saving fails. */
    getText?: () => string,
}

export interface DatabaseHandover {
    getState: () => DatabaseHandoverState,
    subscribe: (listener: () => void) => () => void,
    addParticipant: (participant: DatabaseHandoverParticipant) => () => void,
}

interface HandoverSteps {
    /** Settles when the tab's own database start has. */
    whenStarted: () => Promise<unknown>,
    /** Resolves after everything committed so far is in IndexedDB. */
    syncToStorage: () => Promise<void>,
    leaveDatabase: () => Promise<void>,
}

const RETRY_MS = 200;
const DEFAULT_SAVE_TIMEOUT_MS = 30_000;

export const createDatabaseHandover = (saveTimeoutMs = DEFAULT_SAVE_TIMEOUT_MS) => {
    const participants = new Set<DatabaseHandoverParticipant>();
    const listeners = new Set<() => void>();
    let state: DatabaseHandoverState = {status: 'idle'};

    const setState = (next: DatabaseHandoverState) => {
        state = next;
        listeners.forEach(listener => listener());
    };

    const stopEditing = (participant: DatabaseHandoverParticipant) => {
        try {
            participant.stopEditing?.();
        } catch (error) {
            // A participant that throws must not wedge the handover in `saving`.
            console.error('[db] A handover participant failed to stop editing.', error);
        }
    };

    const stopAllEditing = () => {
        participants.forEach(stopEditing);
    };

    const textOf = (participant: DatabaseHandoverParticipant) => {
        try {
            return participant.getText?.() ?? '';
        } catch (error) {
            console.error('[db] A handover participant failed to provide its text.', error);

            return '';
        }
    };

    const collectText = () => [...participants].map(textOf).filter(Boolean).join('\n\n');

    const saveOnce = async (syncToStorage: () => Promise<void>) => {
        const results = await Promise.all([...participants].map(participant => participant.flush()));

        if (results.includes(false)) {
            return false;
        }

        await syncToStorage();

        return true;
    };

    /*
     * A failed attempt is retried until the deadline. A follower's save fails
     * with "Leader changed" when the leader's tab closes under it; its own
     * worker takes over moments later and the next attempt succeeds.
     */
    const saveUntil = async (deadline: number, syncToStorage: () => Promise<void>) => {
        while (Date.now() < deadline) {
            if (await saveOnce(syncToStorage).catch(error => {
                console.error('[db] A handover save failed; it will be retried.', error);

                return false;
            })) {
                return true;
            }

            await sleep(RETRY_MS);
        }

        return false;
    };

    const saveEverything = (syncToStorage: () => Promise<void>) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        // A save can hang for good when its leader is gone, so the deadline cannot rely on it returning.
        const timedOut = new Promise<boolean>(resolve => {
            timer = setTimeout(() => resolve(false), saveTimeoutMs);
        });

        return Promise.race([saveUntil(Date.now() + saveTimeoutMs, syncToStorage), timedOut])
            .finally(() => clearTimeout(timer));
    };

    const handover: DatabaseHandover = {
        getState: () => state,
        subscribe: listener => {
            listeners.add(listener);

            return () => listeners.delete(listener);
        },
        addParticipant: participant => {
            participants.add(participant);

            if (state.status !== 'idle') {
                stopEditing(participant);
            }

            return () => participants.delete(participant);
        },
    };

    return {
        handover,

        run: async ({
            whenStarted,
            syncToStorage,
            leaveDatabase,
        }: HandoverSteps) => {
            if (state.status !== 'idle') {
                return;
            }

            setState({status: 'saving'});

            try {
                /*
                 * A start that never answers must not leave "Saving your work" covering the
                 * boot failure screen. Nothing has booted, so leaving is safe.
                 */
                await Promise.race([
                    whenStarted(),
                    sleep(saveTimeoutMs).then(() => {
                        throw new Error('The database start did not answer in time.');
                    }),
                ]);
            } catch {
                // The start failed (or never answered) and left the database by itself; its own screen is up.
                setState({status: 'idle'});

                return;
            }

            stopAllEditing();

            if (!await saveEverything(syncToStorage)) {
                setState({status: 'save-failed', text: collectText()});

                return;
            }

            setState({status: 'saved'});
            await leaveDatabase();
        },

        /** The database cannot be reached from this tab any more: stops edits and offers the text. */
        reportLost: () => {
            if (state.status === 'saved') {
                return;
            }

            stopAllEditing();
            setState({status: 'database-lost', text: collectText()});
        },
    };
};

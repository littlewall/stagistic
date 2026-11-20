import type {CreateScriptEditingLocksOptions} from './editingChannel';
import type {
    ExclusiveResult,
    ScriptEditingLocks,
    ScriptEditingParticipant,
    ScriptEditingReason,
    ScriptEditingSession,
    ScriptEditingState,
} from './types';

const DEFAULT_TAKEOVER_TIMEOUT_MS = 4000;
const REQUEUE_DELAY_MS = 50;
const lockName = (scriptId: string) => `stagistic-script-edit:${scriptId}`;

/**
 * One tab edits one script's text at a time. The edit lock is a Web Lock per
 * script id, so it vanishes when its tab closes or crashes. A tab that wants
 * to edit asks the holder to save and let go; a holder that stays silent loses
 * the lock anyway and finds out when it wakes. The saved revision on the script
 * is the backstop for everything this cannot see.
 *
 * A read-only tab waits in the lock's queue, so when the editing tab closes or
 * leaves the script, the browser hands the lock to the next waiting tab, which
 * loads the latest text and edits. Some open tab always edits.
 *
 * A tab has one session per script, shared by everything that shows the script.
 * It takes the lock when first retained and lets it go one macrotask after the
 * last release, so a remount in the same tab keeps editing.
 */
export const createScriptEditingLocks = ({
    locks,
    channel,
    takeoverTimeoutMs = DEFAULT_TAKEOVER_TIMEOUT_MS,
    createId = () => crypto.randomUUID(),
}: CreateScriptEditingLocksOptions): ScriptEditingLocks => {
    const tabId = createId();
    const sessions = new Map<string, ScriptEditingSession>();

    const create = (scriptId: string): ScriptEditingSession => {
        const name = lockName(scriptId);
        const listeners = new Set<() => void>();
        let state: ScriptEditingState = {
            role: 'acquiring',
            reason: null,
            isTakingOver: false,
            loadEpoch: 0,
            rescueText: null,
        };
        let participant: ScriptEditingParticipant | null = null;
        let releaseLock: (() => void) | null = null;
        let unsubscribeChannel: (() => void) | null = null;
        let turnWait: AbortController | null = null;
        /** A tab that asked for editing and has not started yet; a queued wait must not get in its way. */
        let pendingTaker: {from: string, until: number} | null = null;
        let closeTimer: ReturnType<typeof setTimeout> | undefined;
        let holderChanged = false;
        let references = 0;
        let isClosed = true;

        const setState = (patch: Partial<ScriptEditingState>) => {
            state = {...state, ...patch};
            listeners.forEach(listener => listener());
        };
        const release = () => {
            releaseLock?.();
            releaseLock = null;
        };
        const startEditing = () => {
            setState({
                role: 'editing',
                reason: null,
                isTakingOver: false,
                loadEpoch: state.loadEpoch + 1,
            });
            channel.post({
                type: 'editing-started',
                scriptId,
                from: tabId,
            });
        };
        const stopWaiting = () => {
            turnWait?.abort();
            turnWait = null;
        };
        const goReadOnly = (reason: ScriptEditingReason, patch: Partial<ScriptEditingState> = {}) => {
            setState({
                role: 'read-only',
                reason,
                isTakingOver: false,
                loadEpoch: state.loadEpoch + 1,
                ...patch,
            });
            // Called while still holding when handing over: the queue puts this tab behind the taker.
            waitForTurn();
        };
        const unsavedText = () => participant?.isDirty() ? participant.getText() : null;

        /*
         * Resolves true once this tab holds the lock; the lock stays held until
         * `release` or until another tab steals it.
         */
        const hold = (options: {
            ifAvailable?: boolean,
            steal?: boolean,
            signal?: AbortSignal,
        }) => new Promise<boolean>(resolve => {
            let isHolding = false;

            locks.request(name, options, lock => {
                if (!lock) {
                    resolve(false);

                    return;
                }

                isHolding = true;
                resolve(true);

                return new Promise<void>(done => {
                    releaseLock = done;
                });
            }).catch(() => {
                // Stolen while held, or the wait was aborted.
                if (isHolding) {
                    releaseLock = null;

                    if (!isClosed && state.role === 'editing') {
                        goReadOnly('lost', {rescueText: unsavedText()});
                    }
                } else {
                    resolve(false);
                }
            });
        });

        /** Queues for the lock; the browser grants it once the editing tab lets go or closes. */
        const waitForTurn = () => {
            if (turnWait || isClosed) {
                return;
            }

            const wait = new AbortController();

            turnWait = wait;
            void hold({signal: wait.signal}).then(isHeld => {
                turnWait = turnWait === wait ? null : turnWait;

                if (!isHeld) {
                    return;
                }

                // Granted just as the wait was dropped (closed, or taking over by request).
                if (wait.signal.aborted || isClosed || state.role !== 'read-only') {
                    release();

                    return;
                }

                // Another tab asked for editing: let it go and queue again behind that tab's request.
                if (pendingTaker && Date.now() < pendingTaker.until) {
                    release();
                    // A pause, so a taker that closed before starting does not make this spin.
                    setTimeout(waitForTurn, REQUEUE_DELAY_MS);

                    return;
                }

                startEditing();
            });
        };

        const handOver = async () => {
            if (state.role !== 'editing') {
                return;
            }

            const current = participant;
            const saved = await (current?.flush() ?? Promise.resolve(true)).catch(() => false);

            if (state.role !== 'editing') {
                return;
            }

            // Only text still missing from the database is at risk; a failed side participant is not the script.
            goReadOnly('handed-over', {rescueText: saved ? null : unsavedText()});
            release();
        };

        const acquire = async () => {
            let isHeld = await hold({ifAvailable: true});

            if (!isHeld && !isClosed) {
                // A lock this tab let go a moment ago is released a moment later.
                await new Promise(resolve => setTimeout(resolve, 0));
                isHeld = !isClosed && await hold({ifAvailable: true});
            }

            if (isClosed) {
                release();

                return;
            }

            if (isHeld) {
                setState({role: 'editing', reason: null});
                channel.post({
                    type: 'editing-started',
                    scriptId,
                    from: tabId,
                });
            } else {
                setState({role: 'read-only', reason: 'held-elsewhere'});
                waitForTurn();
            }
        };

        const start = () => {
            isClosed = false;
            state = {
                ...state,
                role: 'acquiring',
                reason: null,
                isTakingOver: false,
                loadEpoch: state.loadEpoch + 1,
                rescueText: null,
            };
            unsubscribeChannel = channel.subscribe(message => {
                if (message.scriptId !== scriptId || message.from === tabId) {
                    return;
                }

                if (message.type === 'takeover-request') {
                    pendingTaker = {from: message.from, until: Date.now() + takeoverTimeoutMs * 2};
                    void handOver();
                } else {
                    holderChanged = true;

                    if (pendingTaker?.from === message.from) {
                        pendingTaker = null;
                    }
                }
            });
            void acquire();
        };
        const close = () => {
            isClosed = true;
            stopWaiting();
            unsubscribeChannel?.();
            unsubscribeChannel = null;

            release();
        };

        const takeOver = async () => {
            if (state.role !== 'read-only' || state.isTakingOver || isClosed) {
                return;
            }

            // This tab's own queued wait would stand in front of the request below.
            stopWaiting();
            setState({isTakingOver: true});

            let isHeld = false;

            while (!isHeld && !isClosed) {
                holderChanged = false;
                channel.post({
                    type: 'takeover-request',
                    scriptId,
                    from: tabId,
                });

                const waiting = new AbortController();
                const timer = setTimeout(() => waiting.abort(), takeoverTimeoutMs);

                isHeld = await hold({signal: waiting.signal});
                clearTimeout(timer);

                // Another tab won the lock meanwhile: ask it instead of taking the lock from it.
                if (!isHeld && !isClosed && !holderChanged) {
                    isHeld = await hold({steal: true});
                }
            }

            if (isClosed) {
                release();

                return;
            }

            startEditing();
        };

        const session: ScriptEditingSession = {
            getState: () => state,
            subscribe: listener => {
                listeners.add(listener);

                return () => listeners.delete(listener);
            },
            registerParticipant: next => {
                participant = next;

                return () => {
                    if (participant === next) {
                        participant = null;
                    }
                };
            },
            takeOver,
            reload: () => {
                if (state.role === 'read-only') {
                    setState({loadEpoch: state.loadEpoch + 1});
                }
            },
            markRefused: () => {
                if (isClosed || state.role !== 'editing') {
                    return false;
                }

                goReadOnly('refused', {rescueText: participant?.getText() ?? null});
                release();

                return true;
            },
            dismissRescue: () => setState({rescueText: null}),
            retain: () => {
                references += 1;
                clearTimeout(closeTimer);

                if (isClosed) {
                    start();
                }

                let isReleased = false;

                return () => {
                    if (isReleased) {
                        return;
                    }

                    isReleased = true;
                    references -= 1;

                    if (references === 0) {
                        closeTimer = setTimeout(close, 0);
                    }
                };
            },
        };

        sessions.set(scriptId, session);

        return session;
    };

    const getSession = (scriptId: string) => sessions.get(scriptId) ?? create(scriptId);

    const settled = (target: ScriptEditingSession) => new Promise<void>(resolve => {
        const unsubscribe = target.subscribe(() => {
            if (target.getState().role !== 'acquiring') {
                unsubscribe();
                resolve();
            }
        });

        if (target.getState().role !== 'acquiring') {
            unsubscribe();
            resolve();
        }
    });

    const runExclusive = async <T>(scriptId: string, run: () => Promise<T>): Promise<ExclusiveResult<T>> => {
        const target = getSession(scriptId);
        const releaseSession = target.retain();

        try {
            await settled(target);

            if (target.getState().role !== 'editing') {
                return {ran: false};
            }

            return {ran: true, value: await run()};
        } finally {
            releaseSession();
        }
    };

    return {session: getSession, runExclusive};
};

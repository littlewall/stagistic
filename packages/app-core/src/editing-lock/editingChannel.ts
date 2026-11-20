/** The part of `navigator.locks` this module uses. */
export interface EditingLockManager {
    request: (
        name: string,
        options: {
            ifAvailable?: boolean,
            steal?: boolean,
            signal?: AbortSignal,
        },
        callback: (lock: unknown) => Promise<void> | void,
    ) => Promise<unknown>,
}

export interface EditingMessage {
    /** `editing-started`: the sender took the lock, so whoever was asked before has changed. */
    type: 'takeover-request' | 'editing-started',
    scriptId: string,
    from: string,
}

/** Delivers messages to the other tabs, never to the sender. */
export interface EditingChannel {
    post: (message: EditingMessage) => void,
    subscribe: (listener: (message: EditingMessage) => void) => () => void,
}

export interface CreateScriptEditingLocksOptions {
    locks: EditingLockManager,
    channel: EditingChannel,
    /** How long an editing tab may take to hand over before its lock is taken anyway. */
    takeoverTimeoutMs?: number,
    createId?: () => string,
}

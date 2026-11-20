import type {ScriptEditingLocks, ScriptEditingSession} from './types';

const EDITING_STATE = Object.freeze({
    role: 'editing',
    reason: null,
    isTakingOver: false,
    loadEpoch: 0,
    rescueText: null,
} as const);

const noop = () => {};

const alwaysEditingSession: ScriptEditingSession = {
    getState: () => EDITING_STATE,
    subscribe: () => noop,
    registerParticipant: () => noop,
    takeOver: () => Promise.resolve(),
    reload: noop,
    markRefused: () => false,
    dismissRescue: noop,
    retain: () => noop,
};

/** For one window per database (desktop, tests): every script is editable. */
export const alwaysEditingLocks: ScriptEditingLocks = {
    session: () => alwaysEditingSession,
    runExclusive: async (_scriptId, run) => ({ran: true, value: await run()}),
};

export const RESTORE_DISCARDED_MESSAGE = 'The backup could not be restored. Your scripts were not changed.';

let discarded = false;

/** Records the outcome of the start-up restore so the UI can tell the user once it is shown. */
export const recordRestoreResult = (result: 'none' | 'restored' | 'discarded') => {
    discarded = result === 'discarded';
};

/** True once after a staged backup was dropped at start. */
export const takeRestoreDiscarded = (): boolean => {
    const value = discarded;

    discarded = false;

    return value;
};

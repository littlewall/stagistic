import {DEFAULT_SHUTDOWN_TIMEOUT_MS, type SettleResult} from './desktopController';

/** A settle that has not finished within the bound counts as failed: unsaved text may still be unwritten. */
export const settleWithin = async (
    settle: () => Promise<SettleResult>,
    ms: number = DEFAULT_SHUTDOWN_TIMEOUT_MS,
): Promise<SettleResult> => {
    let handle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<SettleResult>(resolve => {
        handle = setTimeout(() => resolve('failed'), ms);
    });

    try {
        return await Promise.race([settle(), timeout]);
    } finally {
        clearTimeout(handle);
    }
};

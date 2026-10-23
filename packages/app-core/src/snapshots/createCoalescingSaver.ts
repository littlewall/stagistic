/**
 * Runs `save` at most once at a time. Requests made while a save runs collapse
 * into one more save after it, so the last state always lands without queuing
 * a save per request.
 */
export const createCoalescingSaver = (save: () => Promise<unknown>, onError: (error: unknown) => void) => {
    let running: Promise<void> | null = null;
    let isPending = false;

    const run = async () => {
        while (isPending) {
            isPending = false;

            try {
                await save();
            } catch (error) {
                onError(error);
            }
        }
    };

    const request = () => {
        isPending = true;
        running ??= run().finally(() => {
            running = null;
        });
    };

    /** Resolves once every requested save has finished. */
    const flush = async () => {
        while (running) {
            await running;
        }
    };

    return {request, flush};
};

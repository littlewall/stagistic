interface CreateGenerationSaveQueueOptions {
    getGeneration: () => number,
    run: (generation: number) => Promise<void>,
}

export const createGenerationSaveQueue = ({
    getGeneration,
    run,
}: CreateGenerationSaveQueueOptions) => {
    let savePromise: Promise<void> | null = null;
    let savePromiseGeneration: number | null = null;

    const execute = (): Promise<void> => {
        if (savePromise) {
            const pendingSave = savePromise;
            const pendingGeneration = savePromiseGeneration;
            const requestedGeneration = getGeneration();

            return pendingSave.catch(error => {
                if (pendingGeneration === requestedGeneration) {
                    throw error;
                }
            }).then(() => {
                if (requestedGeneration !== getGeneration()) {
                    return;
                }

                return execute();
            });
        }

        const saveGeneration = getGeneration();
        const currentSave = run(saveGeneration).finally(() => {
            if (savePromise !== currentSave) {
                return;
            }

            savePromise = null;
            savePromiseGeneration = null;
        });

        savePromise = currentSave;
        savePromiseGeneration = saveGeneration;

        return currentSave;
    };

    return {execute};
};

export const createKeyedTaskQueue = <TKey extends string | number>() => {
    const queues = new Map<TKey, Promise<void>>();

    return (key: TKey, task: () => Promise<void>) => {
        const previous = queues.get(key) ?? Promise.resolve();
        const current = previous.catch(() => undefined).then(task);

        queues.set(key, current);
        void current.finally(() => {
            if (queues.get(key) === current) {
                queues.delete(key);
            }
        }).catch(() => undefined);

        return current;
    };
};

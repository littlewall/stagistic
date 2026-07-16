export const createRepositoryStoreRegistry = <
    TRepository extends object,
    TStore,
>(createStore: (repository: TRepository, key: string) => TStore) => {
    const storesByRepository = new WeakMap<TRepository, Map<string, TStore>>();

    return (repository: TRepository, key: string) => {
        let stores = storesByRepository.get(repository);

        if (!stores) {
            stores = new Map();
            storesByRepository.set(repository, stores);
        }

        const existing = stores.get(key);

        if (existing) {
            return existing;
        }

        const store = createStore(repository, key);

        stores.set(key, store);

        return store;
    };
};

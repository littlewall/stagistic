import {IndexeddbPersistence} from 'y-indexeddb';
import * as Y from 'yjs';

/** Durable local storage of Y docs (y-indexeddb in the app, memory in tests). */
export interface DocPersistence {
    /** Loads stored state into `doc` and keeps persisting its updates. */
    bind(name: string, doc: Y.Doc): Promise<{destroy(): Promise<void>}>,
    /** Deletes the stored state of `name`. */
    clear(name: string): Promise<void>,
}

const IDB_PREFIX = 'stagistic-ydoc:';

export const createIndexeddbDocPersistence = (): DocPersistence => ({
    bind: async (name, doc) => {
        const persistence = new IndexeddbPersistence(`${IDB_PREFIX}${name}`, doc);

        await persistence.whenSynced;

        return {destroy: () => persistence.destroy()};
    },
    clear: async name => {
        const persistence = new IndexeddbPersistence(`${IDB_PREFIX}${name}`, new Y.Doc());

        await persistence.whenSynced;
        await persistence.clearData();
    },
});

/** In-memory persistence for tests; `store` survives engine restarts. */
export const createMemoryDocPersistence = (store = new Map<string, Uint8Array[]>()): DocPersistence & {store: Map<string, Uint8Array[]>} => ({
    store,
    bind: (name, doc) => {
        const updates = store.get(name) ?? [];

        store.set(name, updates);
        doc.transact(() => updates.forEach(update => Y.applyUpdate(doc, update)), 'persistence');

        const onUpdate = (update: Uint8Array, origin: unknown) => {
            if (origin !== 'persistence') {
                store.get(name)?.push(update);
            }
        };

        doc.on('update', onUpdate);

        return Promise.resolve({
            destroy: () => {
                doc.off('update', onUpdate);

                return Promise.resolve();
            },
        });
    },
    clear: name => {
        store.delete(name);

        return Promise.resolve();
    },
});

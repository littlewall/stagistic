import type {FileStorage} from '@stagistic/db';
import {uuidv7} from '@stagistic/shared';

const DB_NAME = 'stagistic-files';
const STORE = 'files';

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, {keyPath: 'id'});
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | undefined> => {
    const db = await openDatabase();

    try {
        return await new Promise<T | undefined>((resolve, reject) => {
            const transaction = db.transaction(STORE, mode);
            const request = run(transaction.objectStore(STORE));

            transaction.oncomplete = () => resolve(request?.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    } finally {
        db.close();
    }
};

export class IndexedDbFileStorage implements FileStorage {
    async save(blob: Blob): Promise<string> {
        const id = uuidv7();

        await runTransaction('readwrite', store => store.put({id, blob}));

        if (navigator.storage?.persist) {
            void navigator.storage.persist();
        }

        return id;
    }

    async get(key: string): Promise<Blob | null> {
        const record = await runTransaction<{id: string, blob: Blob}>('readonly', store => store.get(key));

        return record?.blob ?? null;
    }

    async delete(key: string): Promise<void> {
        await runTransaction('readwrite', store => store.delete(key));
    }
}

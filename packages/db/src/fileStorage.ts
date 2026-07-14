import {uuidv7} from '@stagistic/shared';

export interface FileStorage {
    save(blob: Blob): Promise<string>,
    get(key: string): Promise<Blob | null>,
    delete(key: string): Promise<void>,
}

export class InMemoryFileStorage implements FileStorage {
    private readonly blobs = new Map<string, Blob>();

    save(blob: Blob): Promise<string> {
        const key = uuidv7();

        this.blobs.set(key, blob);

        return Promise.resolve(key);
    }

    get(key: string): Promise<Blob | null> {
        return Promise.resolve(this.blobs.get(key) ?? null);
    }

    delete(key: string): Promise<void> {
        this.blobs.delete(key);

        return Promise.resolve();
    }
}

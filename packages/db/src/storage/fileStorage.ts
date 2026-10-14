import {uuidv7} from '@stagistic/shared';

export interface FileStorage {
    save(blob: Blob): Promise<string>,
    /** Stores under a known key (an attachment downloaded from the cloud keeps its key). */
    put(key: string, blob: Blob): Promise<void>,
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

    put(key: string, blob: Blob): Promise<void> {
        this.blobs.set(key, blob);

        return Promise.resolve();
    }

    get(key: string): Promise<Blob | null> {
        return Promise.resolve(this.blobs.get(key) ?? null);
    }

    delete(key: string): Promise<void> {
        this.blobs.delete(key);

        return Promise.resolve();
    }
}

/** Hex SHA-256 of a blob (Web Crypto: browser, worker, Node, Deno). */
export const sha256Hex = async (blob: Blob) => {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());

    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

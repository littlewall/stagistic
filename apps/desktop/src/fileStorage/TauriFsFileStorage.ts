import type {FileStorage} from '@stagistic/db';
import {uuidv7} from '@stagistic/shared';
import {BaseDirectory, exists, mkdir, readFile, remove, writeFile} from '@tauri-apps/plugin-fs';

const ATTACHMENTS_DIR = 'attachments';

const pathFor = (key: string): string => `${ATTACHMENTS_DIR}/${key}`;

// Stores attachment blobs as real files under the app data folder
// (…/attachments/<uuid>), instead of IndexedDB. Durable, inspectable, and
// portable alongside the database backups.
export class TauriFsFileStorage implements FileStorage {
    private ready: Promise<void> | null = null;

    private ensureDir(): Promise<void> {
        this.ready ??= mkdir(ATTACHMENTS_DIR, {baseDir: BaseDirectory.AppData, recursive: true});

        return this.ready;
    }

    async save(blob: Blob): Promise<string> {
        await this.ensureDir();

        const key = uuidv7();
        const bytes = new Uint8Array(await blob.arrayBuffer());

        await writeFile(pathFor(key), bytes, {baseDir: BaseDirectory.AppData});

        return key;
    }

    async get(key: string): Promise<Blob | null> {
        if (!(await exists(pathFor(key), {baseDir: BaseDirectory.AppData}))) {
            return null;
        }

        const bytes = await readFile(pathFor(key), {baseDir: BaseDirectory.AppData});

        return new Blob([bytes]);
    }

    async delete(key: string): Promise<void> {
        if (await exists(pathFor(key), {baseDir: BaseDirectory.AppData})) {
            await remove(pathFor(key), {baseDir: BaseDirectory.AppData});
        }
    }
}

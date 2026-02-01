import {appDataDir, join} from '@tauri-apps/api/path';
import Database from '@tauri-apps/plugin-sql';

type LoadLocalDbOptions = {
    path?: string,
};

export const loadLocalDb = async (options?: LoadLocalDbOptions) => {
    const dbPath = options?.path;
    const resolvedPath = dbPath
        ? dbPath.startsWith('sqlite:') ? dbPath : `sqlite:${dbPath}`
        : `sqlite:${await join(await appDataDir(), 'stagistic.db')}`;

    console.info('Local SQLite database path', resolvedPath);

    const db = await Database.load(resolvedPath);

    await db.select('SELECT 1');
    console.info('Local SQLite database loaded');

    return db;
};

import Database from '@tauri-apps/plugin-sql';

export const loadLocalDb = async () => {
    const db = await Database.load('sqlite:stagistic.db');
    await db.select('SELECT 1');
    console.info('Local SQLite database loaded');
    return db;
};

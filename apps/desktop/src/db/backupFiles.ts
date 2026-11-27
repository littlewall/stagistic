/*
 * Names of the backup files in the app data `backups/` folder. Pure, so the
 * rules (two kinds, separate retention) are testable without Tauri.
 *
 * - Periodic: `stagistic-YYYYMMDD-HHMMSS.pgdata.gz`.
 * - Before an update: `stagistic-premigration-YYYYMMDD-HHMMSS.pgdata.gz`.
 * Retention is `staleBackups`.
 */
export const BACKUP_DIR = 'backups';
export const RECENT_BACKUPS = 4;
export const DAILY_BACKUPS = 3;
export const PREMIGRATION_KEEP_DAYS = 14;

const SUFFIX = '.pgdata.gz';
const STAMP = String.raw`(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})`;
const PERIODIC = new RegExp(`^stagistic-${STAMP}${SUFFIX.replace('.', String.raw`\.`)}$`);
const PREMIGRATION = new RegExp(`^stagistic-premigration-${STAMP}${SUFFIX.replace('.', String.raw`\.`)}$`);

const pad = (value: number) => String(value).padStart(2, '0');

/** Local time, like the periodic names always were. */
const stamp = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

export const periodicBackupName = (date: Date) => `stagistic-${stamp(date)}${SUFFIX}`;
export const premigrationBackupName = (date: Date) => `stagistic-premigration-${stamp(date)}${SUFFIX}`;

/** Name a backup is written under before it is renamed to its final name; never parses as a backup. */
export const temporaryBackupName = (name: string) => `${name}.tmp`;

export const isPeriodicBackupName = (name: string) => PERIODIC.test(name);

const parseStamp = (match: RegExpExecArray): Date => {
    const [
        year,
        month,
        day,
        hour,
        minute,
        second,
    ] = match.slice(1).map(Number);

    return new Date(year, month - 1, day, hour, minute, second);
};

export type BackupKind = 'periodic' | 'premigration';

export interface BackupEntry {
    name: string,
    kind: BackupKind,
    time: Date,
}

/** Backups among `names`, newest first; other files are ignored. */
export const parseBackups = (names: string[]): BackupEntry[] => {
    const entries: BackupEntry[] = [];

    for (const name of names) {
        const periodic = PERIODIC.exec(name);
        const premigration = periodic ? null : PREMIGRATION.exec(name);
        const match = periodic ?? premigration;

        if (match) {
            entries.push({
                name,
                kind: periodic ? 'periodic' : 'premigration',
                time: parseStamp(match),
            });
        }
    }

    return entries.toSorted((first, second) => second.time.getTime() - first.time.getTime() || second.name.localeCompare(first.name));
};

const dayKey = (date: Date) => date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();

/*
 * Retention. A file is kept when any tier keeps it:
 * - recent: the newest 4 periodic backups
 * - daily: the newest periodic backup of each of the 3 calendar days (local time) before today
 * - pre-migration: every one of the last 14 days, and always the newest
 * Normally at most 8 files; temporarily up to 10 (an update that fixes a previous one). Returns the names to delete; unrelated files are never listed.
 */
export const staleBackups = (names: string[], now: Date): string[] => {
    const entries = parseBackups(names);
    const periodic = entries.filter(entry => entry.kind === 'periodic');
    const keep = new Set<string>();

    for (const entry of periodic.slice(0, RECENT_BACKUPS)) {
        keep.add(entry.name);
    }

    const days = new Set(Array.from({length: DAILY_BACKUPS}, (_, index) => {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1 - index);

        return dayKey(day);
    }));

    for (const entry of periodic) {
        const key = dayKey(entry.time);

        if (days.has(key)) {
            keep.add(entry.name);
            days.delete(key);
        }
    }

    const premigrations = entries.filter(entry => entry.kind === 'premigration');
    const cutoff = now.getTime() - PREMIGRATION_KEEP_DAYS * 86_400_000;

    for (const entry of premigrations) {
        if (entry.time.getTime() >= cutoff) {
            keep.add(entry.name);
        }
    }

    if (premigrations[0]) {
        keep.add(premigrations[0].name);
    }

    return entries.filter(entry => !keep.has(entry.name)).map(entry => entry.name);
};

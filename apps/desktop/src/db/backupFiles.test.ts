import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    isPeriodicBackupName,
    parseBackups,
    periodicBackupName,
    premigrationBackupName,
    staleBackups,
    temporaryBackupName,
} from './backupFiles';

const date = new Date(2026, 10, 24, 9, 5, 7);

describe('backup file names', () => {
    it('names the two kinds apart', () => {
        expect(periodicBackupName(date)).toBe('stagistic-20261124-090507.pgdata.gz');
        expect(premigrationBackupName(date)).toBe('stagistic-premigration-20261124-090507.pgdata.gz');
        expect(isPeriodicBackupName(premigrationBackupName(date))).toBe(false);
    });

    it('gives a temporary name that is not a backup and is never pruned', () => {
        const name = periodicBackupName(date);

        expect(parseBackups([temporaryBackupName(name)])).toEqual([]);
        expect(isPeriodicBackupName(temporaryBackupName(name))).toBe(false);
        expect(staleBackups([temporaryBackupName(name)], date)).toEqual([]);
    });
});

describe('retention', () => {
    const now = new Date(2026, 10, 25, 12, 0, 0);
    const at = (...args: [number, number, number, number?, number?]) => periodicBackupName(new Date(args[0], args[1], args[2], args[3] ?? 0, args[4] ?? 0, 0));
    const pre = (...args: [number, number, number]) => premigrationBackupName(new Date(...args));

    it('keeps the newest 4 periodic backups and deletes older ones of today', () => {
        const names = Array.from({length: 6}, (_, index) => at(2026, 10, 25, index + 1));

        expect(staleBackups(names, now).toSorted()).toEqual(names.slice(0, 2));
    });

    it('keeps the newest backup of each of the 3 days before today', () => {
        const recent = [
            8,
            9,
            10,
            11,
        ].map(hour => at(2026, 10, 25, hour));
        const yesterday = [at(2026, 10, 24, 8), at(2026, 10, 24, 20)];
        const twoDays = [at(2026, 10, 23, 8), at(2026, 10, 23, 9)];
        const threeDays = [at(2026, 10, 22, 7)];
        const fourDays = [at(2026, 10, 21, 7)];
        const names = [
            ...recent,
            ...yesterday,
            ...twoDays,
            ...threeDays,
            ...fourDays,
        ];

        expect(staleBackups(names, now).toSorted()).toEqual([
            yesterday[0],
            twoDays[0],
            fourDays[0],
        ].toSorted());
    });

    it('uses local midnight as the day boundary and crosses month ends', () => {
        const first = new Date(2026, 11, 1, 10, 0, 0);
        const lateLastMonth = at(2026, 10, 30, 23, 59);
        const earlyLastMonth = at(2026, 10, 30, 0, 1);
        const todayOnly = [
            1,
            2,
            3,
            4,
        ].map(hour => at(2026, 11, 1, hour));

        expect(staleBackups([
            lateLastMonth,
            earlyLastMonth,
            ...todayOnly,
        ], first)).toEqual([earlyLastMonth]);
    });

    it('keeps every pre-migration backup of the last 14 days', () => {
        const first = pre(2026, 10, 21);
        const second = pre(2026, 10, 23);

        expect(staleBackups([first, second], now)).toEqual([]);
    });

    it('drops a pre-migration backup older than 14 days when a newer one exists', () => {
        const old = pre(2026, 10, 5);
        const newer = pre(2026, 10, 23);

        expect(staleBackups([
            newer,
            old,
            at(2026, 10, 25, 1),
        ], now)).toEqual([old]);
    });

    it('always keeps the newest pre-migration backup, however old', () => {
        const old = pre(2026, 0, 1);

        expect(staleBackups([old], now)).toEqual([]);
    });

    it('never keeps more than 8 files and ignores other files', () => {
        const names = [
            ...Array.from({length: 30}, (_, index) => at(2026, 10, 20 + Math.floor(index / 6), index % 6)),
            pre(2026, 10, 1),
            pre(2026, 10, 2),
            'notes.txt',
        ];
        const stale = new Set(staleBackups(names, now));
        const kept = parseBackups(names).filter(entry => !stale.has(entry.name));

        expect(kept.length).toBeLessThanOrEqual(8);
        expect(stale.has('notes.txt')).toBe(false);
    });
});

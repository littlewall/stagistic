import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {periodicBackupName, staleBackups} from '../db/backupFiles';
import {createRestoreController, type RestorePorts} from './restoreController';

const setup = (overrides: Partial<RestorePorts> = {}) => {
    const calls: string[] = [];
    const step = (name: string) => () => {
        calls.push(name);

        return Promise.resolve();
    };
    const ports: RestorePorts = {
        validate: step('validate'),
        settleUnsavedWork: () => {
            calls.push('settle');

            return Promise.resolve('saved');
        },
        flush: step('flush'),
        writeSafetyBackup: step('safety-backup'),
        stage: step('stage'),
        unstage: step('unstage'),
        relaunch: step('relaunch'),
        reportError: () => {
            calls.push('report');
        },
        ...overrides,
    };

    return {calls, controller: createRestoreController(ports)};
};

describe('restore controller', () => {
    it('saves, stages, backs up the current state and relaunches in that order', async () => {
        const {calls, controller} = setup();

        expect(await controller.restore('a.pgdata.gz')).toEqual({ok: true});
        expect(calls).toEqual([
            'validate',
            'settle',
            'flush',
            'stage',
            'safety-backup',
            'relaunch',
        ]);
    });

    it('stops before touching anything when the backup is unreadable', async () => {
        const {calls, controller} = setup({validate: () => Promise.reject(new Error('bad file'))});
        const result = await controller.restore('a.pgdata.gz');

        expect(result.ok).toBe(false);
        expect(calls).toEqual(['report']);
    });

    it('does not stage or relaunch when saving fails', async () => {
        const {calls, controller} = setup({settleUnsavedWork: () => Promise.resolve('failed')});

        expect((await controller.restore('a')).ok).toBe(false);
        expect(calls).toEqual(['validate', 'report']);
    });

    it('does not stage or relaunch when the safety backup fails', async () => {
        const {calls, controller} = setup({writeSafetyBackup: () => Promise.reject(new Error('disk full'))});

        expect((await controller.restore('a')).ok).toBe(false);
        expect(calls).not.toContain('relaunch');
        expect(calls.slice(-3)).toEqual([
            'stage',
            'unstage',
            'report',
        ]);
    });

    it('keeps the chosen backup usable although the safety backup prunes the folder', async () => {
        const base = new Date(2026, 10, 20, 12, 0, 0);
        const names = Array.from({length: 4}, (_, index) => periodicBackupName(new Date(base.getTime() - index * 900_000)));
        const folder = new Set(names);
        const chosen = names[3];
        let staged: string | null = null;
        const {controller} = setup({
            stage: source => {
                staged = folder.has(source) ? source : null;

                return Promise.resolve();
            },
            writeSafetyBackup: () => {
                folder.add(periodicBackupName(new Date(base.getTime() + 900_000)));
                for (const stale of staleBackups([...folder], new Date(base.getTime() + 900_000))) {
                    folder.delete(stale);
                }

                return Promise.resolve();
            },
        });

        expect((await controller.restore(chosen)).ok).toBe(true);
        expect(staged).toBe(chosen);
        expect(folder.has(chosen)).toBe(false);
    });

    it('removes the staged file when the relaunch fails', async () => {
        const {calls, controller} = setup({relaunch: () => Promise.reject(new Error('no'))});

        expect((await controller.restore('a')).ok).toBe(false);
        expect(calls.slice(-2)).toEqual(['unstage', 'report']);
    });

    it('ignores a second restore while one runs', async () => {
        let release = () => {};
        const {controller} = setup({
            flush: () => new Promise<void>(resolve => {
                release = resolve;
            }),
        });
        const first = controller.restore('a');

        await Promise.resolve();
        await Promise.resolve();

        expect((await controller.restore('b')).ok).toBe(false);
        release();
        expect(await first).toEqual({ok: true});
    });
});

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    classifyScripts,
    computeClockOffset,
    pickNewerSide,
} from './classify';

const ACCOUNT = 'acc-1';
const SYNCED_AT = 1_000;

describe('classifyScripts', () => {
    it('sorts every category', () => {
        const plan = classifyScripts({
            accountId: ACCOUNT,
            lastSyncedAt: SYNCED_AT,
            local: [
                {
                    scriptId: 'new-local',
                    boundAccountId: null,
                    changedSinceSync: true,
                },
                {
                    scriptId: 'changed-here',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: true,
                },
                {
                    scriptId: 'changed-there',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: false,
                },
                {
                    scriptId: 'changed-both',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: true,
                },
                {
                    scriptId: 'same',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: false,
                },
                {
                    scriptId: 'cloud-deleted',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: false,
                },
                {
                    scriptId: 'cloud-deleted-edited-here',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: true,
                },
                {
                    scriptId: 'foreign',
                    boundAccountId: 'acc-2',
                    changedSinceSync: true,
                },
            ],
            tombstones: [
                {scriptId: 'deleted-here', boundAccountId: ACCOUNT},
                {scriptId: 'deleted-here-edited-there', boundAccountId: ACCOUNT},
                {scriptId: 'deleted-foreign', boundAccountId: 'acc-2'},
            ],
            cloud: [
                {
                    scriptId: 'changed-here',
                    updatedAt: 900,
                    deletedAt: null,
                },
                {
                    scriptId: 'changed-there',
                    updatedAt: 1_200,
                    deletedAt: null,
                },
                {
                    scriptId: 'changed-both',
                    updatedAt: 1_200,
                    deletedAt: null,
                },
                {
                    scriptId: 'same',
                    updatedAt: 1_000,
                    deletedAt: null,
                },
                {
                    scriptId: 'cloud-deleted',
                    updatedAt: 1_100,
                    deletedAt: 1_100,
                },
                {
                    scriptId: 'cloud-deleted-edited-here',
                    updatedAt: 1_100,
                    deletedAt: 1_100,
                },
                {
                    scriptId: 'deleted-here',
                    updatedAt: 900,
                    deletedAt: null,
                },
                {
                    scriptId: 'deleted-here-edited-there',
                    updatedAt: 1_300,
                    deletedAt: null,
                },
                {
                    scriptId: 'deleted-foreign',
                    updatedAt: 900,
                    deletedAt: null,
                },
                {
                    scriptId: 'new-cloud',
                    updatedAt: 1_500,
                    deletedAt: null,
                },
                {
                    scriptId: 'gone-cloud',
                    updatedAt: 1_500,
                    deletedAt: 1_500,
                },
            ],
        });

        expect(plan).toEqual({
            upload: ['new-local', 'changed-here'],
            download: ['changed-there', 'new-cloud'],
            deleteCloud: ['deleted-here'],
            deleteLocal: ['cloud-deleted'],
            restoreCloud: ['cloud-deleted-edited-here'],
            restoreLocal: ['deleted-here-edited-there'],
            conflicts: ['changed-both'],
            otherAccount: ['foreign'],
            unchanged: ['same'],
        });
    });

    it('treats an unbound script that already exists in the cloud as a conflict', () => {
        const plan = classifyScripts({
            accountId: ACCOUNT,
            lastSyncedAt: null,
            local: [
                {
                    scriptId: 'x',
                    boundAccountId: null,
                    changedSinceSync: true,
                },
            ],
            tombstones: [],
            cloud: [
                {
                    scriptId: 'x',
                    updatedAt: 1,
                    deletedAt: null,
                },
            ],
        });

        expect(plan.conflicts).toEqual(['x']);
    });

    it('uses the per-script lastSyncedAt when present', () => {
        const plan = classifyScripts({
            accountId: ACCOUNT,
            lastSyncedAt: 0,
            local: [
                {
                    scriptId: 'x',
                    boundAccountId: ACCOUNT,
                    changedSinceSync: false,
                    lastSyncedAt: 2_000,
                },
            ],
            tombstones: [],
            cloud: [
                {
                    scriptId: 'x',
                    updatedAt: 1_500,
                    deletedAt: null,
                },
            ],
        });

        expect(plan.unchanged).toEqual(['x']);
    });
});

describe('clock skew', () => {
    it('corrects local time by the Date header offset', () => {
        const offset = computeClockOffset('Wed, 07 Oct 2026 10:00:10 GMT', Date.parse('Wed, 07 Oct 2026 10:00:00 GMT'));

        expect(offset).toBe(10_000);
        // Local clock is 10 s behind: a local edit at "09:59:55" happened at server 10:00:05.
        expect(pickNewerSide(Date.parse('2026-10-07T09:59:55Z'), Date.parse('2026-10-07T10:00:00Z'), offset)).toBe('local');
        expect(pickNewerSide(Date.parse('2026-10-07T09:59:45Z'), Date.parse('2026-10-07T10:00:00Z'), offset)).toBe('cloud');
    });

    it('falls back to zero offset without a Date header', () => {
        expect(computeClockOffset(null, 5)).toBe(0);
    });
});

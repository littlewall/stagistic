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

describe('classifyScripts', () => {
    const local = (scriptId: string, boundAccountId: string | null, changedSinceSync: boolean) => ({
        scriptId,
        boundAccountId,
        changedSinceSync,
    });
    const cloud = (scriptId: string, changedSinceSync: boolean, deletedAt: number | null = null) => ({
        scriptId,
        changedSinceSync,
        deletedAt,
    });

    it('sorts every category', () => {
        const plan = classifyScripts({
            accountId: ACCOUNT,
            local: [
                local('new-local', null, true),
                local('changed-here', ACCOUNT, true),
                local('changed-there', ACCOUNT, false),
                local('changed-both', ACCOUNT, true),
                local('same', ACCOUNT, false),
                local('cloud-deleted', ACCOUNT, false),
                local('cloud-deleted-edited-here', ACCOUNT, true),
                local('foreign', 'acc-2', true),
            ],
            tombstones: [
                {scriptId: 'deleted-here', boundAccountId: ACCOUNT},
                {scriptId: 'deleted-here-edited-there', boundAccountId: ACCOUNT},
                {scriptId: 'deleted-foreign', boundAccountId: 'acc-2'},
            ],
            cloud: [
                cloud('changed-here', false),
                cloud('changed-there', true),
                cloud('changed-both', true),
                cloud('same', false),
                cloud('cloud-deleted', false, 1),
                cloud('cloud-deleted-edited-here', false, 1),
                cloud('deleted-here', false),
                cloud('deleted-here-edited-there', true),
                cloud('deleted-foreign', false),
                cloud('new-cloud', true),
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
            local: [local('s1', null, false)],
            tombstones: [],
            cloud: [cloud('s1', true)],
        });

        expect(plan.conflicts).toEqual(['s1']);
    });
});

describe('clock helpers', () => {
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

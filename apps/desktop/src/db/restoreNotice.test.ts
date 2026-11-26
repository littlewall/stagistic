import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {recordRestoreResult, takeRestoreDiscarded} from './restoreNotice';

describe('restore notice', () => {
    it('reports a discarded restore once', () => {
        recordRestoreResult('discarded');

        expect(takeRestoreDiscarded()).toBe(true);
        expect(takeRestoreDiscarded()).toBe(false);
    });

    it('stays quiet for a restore that worked or did not exist', () => {
        recordRestoreResult('restored');
        expect(takeRestoreDiscarded()).toBe(false);
        recordRestoreResult('none');
        expect(takeRestoreDiscarded()).toBe(false);
    });
});

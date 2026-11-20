import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {BOOT_STAGE_UPDATES} from './bootStages';

describe('boot stages', () => {
    // A dump of a large database can take longer than the stall window; it must not read as a hang.
    it('treats the backup before migrations as long running and says what it does', () => {
        const update = BOOT_STAGE_UPDATES['backing-up'];

        expect(update.longRunning).toBe(true);
        expect(update.label).toMatch(/back/i);
    });

    it('marks the unbounded waits so the bootstrap can explain them', () => {
        expect(BOOT_STAGE_UPDATES['waiting-for-leader'].waitsForDatabase).toBe(true);
        expect(BOOT_STAGE_UPDATES['backing-up'].waitsForDatabase).toBe(true);
        expect(BOOT_STAGE_UPDATES.migrating.waitsForDatabase).toBe(true);
        expect(BOOT_STAGE_UPDATES['waiting-for-older-version'].waitsForDatabase).toBeUndefined();
        expect(BOOT_STAGE_UPDATES.ready.waitsForDatabase).toBeUndefined();
    });
});

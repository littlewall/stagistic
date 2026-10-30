import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    assertMigrationIds,
    createMigrationId,
    formatMigrationTimestamp,
} from './migrationIds';
import {compiledMigrations} from './migrations.compiled';

describe('migration ids', () => {
    it('accepts the compiled migrations', () => {
        expect(() => assertMigrationIds(compiledMigrations.map(migration => migration.id))).not.toThrow();
    });

    it('formats the UTC timestamp prefix drizzle-kit uses', () => {
        expect(formatMigrationTimestamp(new Date('2026-10-30T09:05:07.123Z'))).toBe('20261030090507');
        expect(createMigrationId('add_notes', new Date('2026-10-30T09:05:07Z'))).toBe('20261030090507_add_notes');
    });

    it('sorts timestamp ids after the frozen sequential ids', () => {
        const ids = [
            '20261030090507_add_notes',
            '0026_script_text_search',
            '0000_green_smiling_tiger',
        ];

        expect(ids.toSorted()).toEqual([
            '0000_green_smiling_tiger',
            '0026_script_text_search',
            '20261030090507_add_notes',
        ]);
    });

    it('rejects new sequential ids', () => {
        expect(() => assertMigrationIds(['0027_scene_board_metadata'])).toThrow('frozen at 0026');
    });

    it('rejects ids sharing a prefix', () => {
        expect(() => assertMigrationIds(['20261030090507_add_notes', '20261030090507_add_tags'])).toThrow(
            'share the prefix 20261030090507',
        );
    });

    it('rejects malformed names and impossible timestamps', () => {
        expect(() => assertMigrationIds(['20261030_add_notes'])).toThrow('must be named');
        expect(() => assertMigrationIds(['20261030090507_Add-Notes'])).toThrow('must be named');
        expect(() => assertMigrationIds(['20261332090507_add_notes'])).toThrow('invalid UTC timestamp');
        expect(() => createMigrationId('Add notes')).toThrow('snake_case');
    });
});

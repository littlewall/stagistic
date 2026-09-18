import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import type {VocalRangesInitialPagePlan} from '../plan';
import type {StaffRowItem} from '../visualLine';
import {buildVocalRangesPages} from './buildVocalRangesPages';

const plan: VocalRangesInitialPagePlan = {
    kind: 'vocal-ranges',
    entries: [
        {
            id: 'a', displayName: 'Kylie', voiceType: 'soprano', low: 'A3', high: 'C6',
        }, {
            id: 'b', displayName: 'Whit', voiceType: null, low: 'C3', high: 'A4',
        },
    ],
};

const isStaffRow = (item: unknown): item is StaffRowItem => Boolean(
    item && typeof item === 'object' && 'type' in item && item.type === 'staff-row',
);

describe('buildVocalRangesPages', () => {
    it('fits ten vocal ranges on the first default page', () => {
        const entries = Array.from({length: 11}, (_, index) => ({
            id: `character-${index}`,
            displayName: `Character ${index}`,
            voiceType: 'soprano',
            low: 'A3',
            high: 'C6',
        }));
        const pages = buildVocalRangesPages(
            {kind: 'vocal-ranges', entries},
            DEFAULT_EDITOR_SETTINGS,
        );
        const rowCounts = pages.map(page => page.filter(isStaffRow).length);

        expect(rowCounts).toEqual([10, 1]);
    });

    it('keeps the five-line staff twice as tall as its label text', () => {
        const [row] = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS)
            .flat()
            .filter(isStaffRow);
        const staffHeight = row.staff.unitPx * 8;

        expect(staffHeight / row.label.fontSizePx).toBe(2);
    });

    it('centers the label against the five staff lines', () => {
        const [row] = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS)
            .flat()
            .filter(isStaffRow);
        const labelCenterY = row.label.y + row.label.fontSizePx / 2;
        const staffCenterY = row.staff.baselineY - row.staff.unitPx * 4;

        expect(labelCenterY).toBe(staffCenterY);
    });

    it('emits one staff row per entry', () => {
        const rows = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS)
            .flat()
            .filter(isStaffRow);

        expect(rows.length).toBe(2);
    });

    it('shows the voice type parenthesis only when present', () => {
        const rows = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS)
            .flat()
            .filter(isStaffRow);

        expect(rows[0].label.text).toBe('Kylie (soprano)');
        expect(rows[1].label.text).toBe('Whit');
    });

    it('picks treble for a high range and treble-8vb for a low one', () => {
        const rows = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS)
            .flat()
            .filter(isStaffRow);

        expect(rows[0].staff.clef).toBe('treble');
        expect(rows[1].staff.clef).toBe('treble-8vb');
    });

    it('places the low note left of the high note', () => {
        const rows = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS)
            .flat()
            .filter(isStaffRow);
        const [low, high] = rows[0].staff.notes;

        expect(low.xFraction).toBeLessThan(high.xFraction);
    });

    it('includes a centered page heading', () => {
        const pages = buildVocalRangesPages(plan, DEFAULT_EDITOR_SETTINGS);
        const heading = pages[0].find(item => !isStaffRow(item) && !('type' in item));

        expect(heading && !isStaffRow(heading) && !('type' in heading) ? heading.runs[0]?.text : null)
            .toBe('VOCAL RANGES');
    });

    it('returns no pages when there are no entries', () => {
        const pages = buildVocalRangesPages({kind: 'vocal-ranges', entries: []}, DEFAULT_EDITOR_SETTINGS);

        expect(pages).toEqual([]);
    });
});

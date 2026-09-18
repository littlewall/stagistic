import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {StaffRowItem} from '../visualLine';
import {createStaffRowDrawingGeometry} from './drawStaffRow';

const staffRow: StaffRowItem = {
    type: 'staff-row',
    label: {
        text: 'Kylie (soprano)', x: 144, y: 400, fontSizePx: 16,
    },
    staff: {
        xPx: 350,
        widthPx: 300,
        baselineY: 440,
        unitPx: 4,
        clef: 'treble',
        notes: [
            {
                position: -2, alter: 0, ledgerPositions: [-2], xFraction: 0.15,
            }, {
                position: 10, alter: -1, ledgerPositions: [10], xFraction: 0.8,
            },
        ],
    },
};

describe('createStaffRowDrawingGeometry', () => {
    it('uses compact notehead dimensions in the export', () => {
        const geometry = createStaffRowDrawingGeometry(staffRow);

        expect(geometry.noteRxPx).toBeCloseTo(4.48);
        expect(geometry.noteRyPx).toBeCloseTo(3.36);
    });

    it('uses compact dimensions for both export accidentals', () => {
        const flatGeometry = createStaffRowDrawingGeometry(staffRow);
        const sharpStaffRow: StaffRowItem = {
            ...staffRow,
            staff: {
                ...staffRow.staff,
                notes: [staffRow.staff.notes[0], {...staffRow.staff.notes[1], alter: 1}],
            },
        };
        const sharpGeometry = createStaffRowDrawingGeometry(sharpStaffRow);

        expect(flatGeometry.notes[1].accidental!.heightPx).toBeCloseTo(19.2);
        expect(sharpGeometry.notes[1].accidental!.heightPx).toBeCloseTo(12.8);
    });

    it('aligns the flat bowl with its note center', () => {
        const geometry = createStaffRowDrawingGeometry(staffRow);
        const high = geometry.notes[1];

        expect(high.accidental).not.toBeNull();
        expect(high.accidental!.bowlCenterYPx).toBe(high.yPx);
    });

    it('keeps the connector clear of both notes and the high accidental', () => {
        const geometry = createStaffRowDrawingGeometry(staffRow);
        const [low, high] = geometry.notes;
        const connector = geometry.connector!;

        expect(connector.x1Px).toBeGreaterThan(low.xPx + geometry.noteRxPx);
        expect(connector.x2Px).toBeLessThan(high.accidental!.xPx);
    });

    it('extends ledger lines beyond both sides of the notehead', () => {
        const geometry = createStaffRowDrawingGeometry(staffRow);

        expect(geometry.ledgerHalfWidthPx).toBeGreaterThan(geometry.noteRxPx);
    });
});

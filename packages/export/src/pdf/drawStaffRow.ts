import {
    ACCIDENTAL_GLYPHS,
    CLEF_GLYPHS,
    type Glyph,
    type GlyphCommand,
} from '@stagistic/script';
import type {jsPDF} from 'jspdf';

import type {StaffRowItem} from '../visualLine';

type StaffRowNote = StaffRowItem['staff']['notes'][number];

const PX_TO_PT = 72 / 96;
const CLEF_HEIGHT_UNITS = 8 * 1.55;
const CLEF_ANCHOR_Y = 1098;
const CLEF_INSET_UNITS = 0.8;
const RANGE_MARK_SCALE = 0.8;
const SHARP_HEIGHT_UNITS = 4 * RANGE_MARK_SCALE;
const FLAT_HEIGHT_UNITS = 6 * RANGE_MARK_SCALE;
const SHARP_ANCHOR_Y = 10;
const FLAT_ANCHOR_Y = 13;
const NOTE_RX_UNITS = 1.4 * RANGE_MARK_SCALE;
const NOTE_RY_UNITS = 1.05 * RANGE_MARK_SCALE;
const LEDGER_PADDING_UNITS = 1;
const ACCIDENTAL_GAP_UNITS = 0.6;
const CONNECTOR_GAP_UNITS = 2.4;
const STAFF_LINE_WIDTH_PT = 0.5;
const NOTE_LINE_WIDTH_PT = 1.2;

interface AccidentalDrawingGeometry {
    glyph: Glyph,
    xPx: number,
    yPx: number,
    widthPx: number,
    heightPx: number,
    scale: number,
    bowlCenterYPx: number,
}

interface NoteDrawingGeometry {
    note: StaffRowNote,
    xPx: number,
    yPx: number,
    accidental: AccidentalDrawingGeometry | null,
}

interface ConnectorDrawingGeometry {
    x1Px: number,
    y1Px: number,
    x2Px: number,
    y2Px: number,
}

export interface StaffRowDrawingGeometry {
    noteRxPx: number,
    noteRyPx: number,
    ledgerHalfWidthPx: number,
    notes: NoteDrawingGeometry[],
    connector: ConnectorDrawingGeometry | null,
}

const createAccidentalGeometry = (
    note: StaffRowNote,
    xPx: number,
    yPx: number,
    unitPx: number,
    noteRxPx: number,
): AccidentalDrawingGeometry | null => {
    if (note.alter === 0) {
        return null;
    }

    const isFlat = note.alter === -1;
    const glyph = isFlat ? ACCIDENTAL_GLYPHS.flat : ACCIDENTAL_GLYPHS.sharp;
    const heightPx = unitPx * (isFlat ? FLAT_HEIGHT_UNITS : SHARP_HEIGHT_UNITS);
    const scale = heightPx / glyph.viewBox.height;
    const widthPx = glyph.viewBox.width * scale;
    const anchorY = isFlat ? FLAT_ANCHOR_Y : SHARP_ANCHOR_Y;
    const accidentalGapPx = unitPx * ACCIDENTAL_GAP_UNITS;

    return {
        glyph,
        xPx: xPx - noteRxPx - accidentalGapPx - widthPx,
        yPx: yPx - anchorY * scale,
        widthPx,
        heightPx,
        scale,
        bowlCenterYPx: yPx,
    };
};

export const createStaffRowDrawingGeometry = (
    item: StaffRowItem,
): StaffRowDrawingGeometry => {
    const {staff} = item;
    const yForPosition = (position: number) => staff.baselineY - position * staff.unitPx;
    const noteRxPx = staff.unitPx * NOTE_RX_UNITS;
    const noteRyPx = staff.unitPx * NOTE_RY_UNITS;
    const ledgerHalfWidthPx = noteRxPx + staff.unitPx * LEDGER_PADDING_UNITS;
    const notes = staff.notes.map(note => {
        const xPx = staff.xPx + staff.widthPx * note.xFraction;
        const yPx = yForPosition(note.position);

        return {
            note,
            xPx,
            yPx,
            accidental: createAccidentalGeometry(note, xPx, yPx, staff.unitPx, noteRxPx),
        };
    });
    const connectorGapPx = staff.unitPx * CONNECTOR_GAP_UNITS;
    const connector = notes.length === 2
        ? {
            x1Px: notes[0].xPx + noteRxPx + connectorGapPx,
            y1Px: notes[0].yPx,
            x2Px: (notes[1].accidental?.xPx ?? notes[1].xPx - noteRxPx) - connectorGapPx,
            y2Px: notes[1].yPx,
        }
        : null;

    return {
        noteRxPx,
        noteRyPx,
        ledgerHalfWidthPx,
        notes,
        connector,
    };
};

const drawGlyphPath = (
    doc: jsPDF,
    commands: GlyphCommand[],
    originXPx: number,
    originYPx: number,
    scale: number,
    paint: 'fill' | 'stroke',
) => {
    const toPt = (localX: number, localY: number): [number, number] => [(originXPx + localX * scale) * PX_TO_PT, (originYPx + localY * scale) * PX_TO_PT];

    commands.forEach(command => {
        if (command.c === 'M') {
            doc.moveTo(...toPt(command.x, command.y));

            return;
        }

        if (command.c === 'L') {
            doc.lineTo(...toPt(command.x, command.y));

            return;
        }

        if (command.c === 'Z') {
            doc.close();

            return;
        }

        const [x1, y1] = toPt(command.x1, command.y1);
        const [x2, y2] = toPt(command.x2, command.y2);
        const [x, y] = toPt(command.x, command.y);

        doc.curveTo(x1, y1, x2, y2, x, y);
    });

    if (paint === 'fill') {
        doc.fill();

        return;
    }

    doc.stroke();
};

export const drawStaffRow = (
    doc: jsPDF,
    item: StaffRowItem,
    monoFontFamily: string,
) => {
    const {staff} = item;
    const geometry = createStaffRowDrawingGeometry(item);
    const pt = (px: number) => px * PX_TO_PT;
    const yForPosition = (position: number) => staff.baselineY - position * staff.unitPx;

    doc.setFont(monoFontFamily, 'normal');
    doc.setFontSize(item.label.fontSizePx * PX_TO_PT);
    doc.text(item.label.text, pt(item.label.x), pt(item.label.y), {baseline: 'top'});

    doc.setLineWidth(STAFF_LINE_WIDTH_PT);
    [
        0,
        2,
        4,
        6,
        8,
    ].forEach(position => {
        const yPt = pt(yForPosition(position));

        doc.line(pt(staff.xPx), yPt, pt(staff.xPx + staff.widthPx), yPt);
    });

    const clefGlyph = CLEF_GLYPHS[staff.clef];
    const clefHeightPx = staff.unitPx * CLEF_HEIGHT_UNITS;
    const clefScale = clefHeightPx / CLEF_GLYPHS.treble.viewBox.height;

    drawGlyphPath(
        doc,
        clefGlyph.commands,
        staff.xPx + staff.unitPx * CLEF_INSET_UNITS,
        yForPosition(2) - CLEF_ANCHOR_Y * clefScale,
        clefScale,
        clefGlyph.paint,
    );

    if (geometry.connector) {
        doc.line(
            pt(geometry.connector.x1Px),
            pt(geometry.connector.y1Px),
            pt(geometry.connector.x2Px),
            pt(geometry.connector.y2Px),
        );
    }

    geometry.notes.forEach(noteGeometry => {
        const {
            accidental,
            note,
            xPx,
            yPx,
        } = noteGeometry;

        if (accidental) {
            drawGlyphPath(
                doc,
                accidental.glyph.commands,
                accidental.xPx,
                accidental.yPx,
                accidental.scale,
                accidental.glyph.paint,
            );
        }

        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(NOTE_LINE_WIDTH_PT);
        doc.ellipse(
            pt(xPx),
            pt(yPx),
            pt(geometry.noteRxPx),
            pt(geometry.noteRyPx),
            'FD',
        );
        doc.setLineWidth(STAFF_LINE_WIDTH_PT);

        note.ledgerPositions.forEach(ledgerPosition => {
            const ledgerYPt = pt(yForPosition(ledgerPosition));

            doc.line(
                pt(xPx - geometry.ledgerHalfWidthPx),
                ledgerYPt,
                pt(xPx + geometry.ledgerHalfWidthPx),
                ledgerYPt,
            );
        });
    });
};

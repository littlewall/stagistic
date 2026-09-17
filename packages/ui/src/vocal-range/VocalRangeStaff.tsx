import {
    ACCIDENTAL_GLYPHS,
    type Clef,
    CLEF_GLYPHS,
    formatPitch,
    ledgerPositions,
    pathToSvgD,
    pickClef,
    type Pitch,
    staffPosition,
} from '@stagistic/script';
import clsx from 'clsx';
import type {KeyboardEvent} from 'react';

import {
    INTERACTIVE_MAX_POSITION,
    INTERACTIVE_MIN_POSITION,
    useVocalRangeStaffInteraction,
} from './useVocalRangeStaffInteraction';
import {
    ACCIDENTAL_NOTE_GAP,
    accidentalAnchorY,
    accidentalHeight,
    CLEF_ANCHOR_Y,
    CLEF_INSET,
    CONNECTOR_GAP,
    HIGH_NOTE_FRACTION,
    LOW_NOTE_FRACTION,
    MANAGER_RESIZE_COMPENSATION,
    NOTEHEAD_RX,
    NOTEHEAD_RY,
    STAFF_LEFT_MARGIN,
    STAFF_LINE_POSITIONS,
    STAFF_RIGHT_MARGIN,
    STAFF_WIDTH,
    UNIT_PX,
    VERTICAL_MARGIN,
} from './VocalRangeStaff.geometry';
import styles from './VocalRangeStaff.module.css';
import type {VocalRangeNote} from './VocalRangeStaff.types';
import {
    VocalRangeHeader,
    VocalRangeNoteControls,
} from './VocalRangeStaffEditor';

interface VocalRangeStaffProps {
    low: Pitch | null,
    high: Pitch | null,
    className?: string,
    interactive?: boolean,
    onChange?: (which: VocalRangeNote, pitch: Pitch) => void,
}

const pickRangeClef = (low: Pitch | null, high: Pitch | null): Clef => {
    if (low && high) {
        return pickClef(low, high);
    }

    const onlyPitch = low ?? high;

    return onlyPitch ? pickClef(onlyPitch, onlyPitch) : 'treble';
};

export const VocalRangeStaff = ({
    low,
    high,
    className,
    interactive = false,
    onChange,
}: VocalRangeStaffProps) => {
    const clef = pickRangeClef(low, high);
    const committedPositions = [
        ...STAFF_LINE_POSITIONS,
        ...low ? [staffPosition(low, clef)] : [],
        ...high ? [staffPosition(high, clef)] : [],
    ];
    const committedExtent = committedPositions.flatMap(position => [position, ...ledgerPositions(position)]);
    const minPosition = interactive
        ? Math.min(INTERACTIVE_MIN_POSITION, ...committedExtent)
        : Math.min(...committedExtent);
    const maxPosition = interactive
        ? Math.max(INTERACTIVE_MAX_POSITION, ...committedExtent)
        : Math.max(...committedExtent);
    const y = (position: number) => VERTICAL_MARGIN + (maxPosition - position) * UNIT_PX;
    const height = VERTICAL_MARGIN * 2 + (maxPosition - minPosition) * UNIT_PX;

    const interaction = useVocalRangeStaffInteraction({
        low,
        high,
        clef,
        viewBoxHeight: height,
        maxPosition,
        unitPx: UNIT_PX,
        verticalMargin: VERTICAL_MARGIN,
        onChange,
    });
    const displayLow = interaction.displayLow;
    const displayHigh = interaction.displayHigh;
    const lowPosition = displayLow ? staffPosition(displayLow, clef) : null;
    const highPosition = displayHigh ? staffPosition(displayHigh, clef) : null;
    const lowLedgers = lowPosition !== null ? ledgerPositions(lowPosition) : [];
    const highLedgers = highPosition !== null ? ledgerPositions(highPosition) : [];

    const clefGlyph = CLEF_GLYPHS[clef];
    const clefHeightPx = (STAFF_LINE_POSITIONS.at(-1)! - STAFF_LINE_POSITIONS[0]) * UNIT_PX * 1.55;
    const clefScale = clefHeightPx / CLEF_GLYPHS.treble.viewBox.height;
    const clefY = y(2) - CLEF_ANCHOR_Y * clefScale;

    const staffStartX = STAFF_LEFT_MARGIN;
    const staffEndX = staffStartX + STAFF_WIDTH;
    const lowX = staffStartX + STAFF_WIDTH * LOW_NOTE_FRACTION;
    const highX = staffStartX + STAFF_WIDTH * HIGH_NOTE_FRACTION;

    const noteRx = NOTEHEAD_RX;
    const noteRy = NOTEHEAD_RY;
    const noteHitRx = UNIT_PX * 2.64 * MANAGER_RESIZE_COMPENSATION;
    const noteHitRy = UNIT_PX * 2.1 * MANAGER_RESIZE_COMPENSATION;
    const ledgerHalfWidth = noteRx + 5;
    const highAccidentalGlyph = displayHigh?.alter === 1
        ? ACCIDENTAL_GLYPHS.sharp
        : displayHigh?.alter === -1
            ? ACCIDENTAL_GLYPHS.flat
            : null;
    const highAccidentalHeight = accidentalHeight(displayHigh);
    const highAccidentalScale = highAccidentalGlyph
        ? highAccidentalHeight / highAccidentalGlyph.viewBox.height
        : 0;
    const highAccidentalWidth = highAccidentalGlyph
        ? highAccidentalGlyph.viewBox.width * highAccidentalScale
        : 0;
    const highAccidentalClearance = highAccidentalGlyph
        ? ACCIDENTAL_NOTE_GAP + highAccidentalWidth
        : 0;

    const handleNoteKeyDown = (which: VocalRangeNote) => (event: KeyboardEvent<SVGGElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        interaction.setSelectedNote(which);
    };
    const renderNote = (
        which: VocalRangeNote,
        pitch: Pitch | null,
        position: number | null,
        x: number,
        ledgers: number[],
    ) => {
        if (!pitch || position === null) {
            return null;
        }

        const noteY = y(position);
        const accidentalGlyph = pitch.alter === 1
            ? ACCIDENTAL_GLYPHS.sharp
            : pitch.alter === -1
                ? ACCIDENTAL_GLYPHS.flat
                : null;
        const accidentalVisualHeight = accidentalHeight(pitch);
        const accidentalScale = accidentalGlyph
            ? accidentalVisualHeight / accidentalGlyph.viewBox.height
            : 0;
        const accidentalWidthPx = accidentalGlyph ? accidentalGlyph.viewBox.width * accidentalScale : 0;
        const accidentalX = x - noteRx - ACCIDENTAL_NOTE_GAP - accidentalWidthPx;
        const accidentalY = noteY - accidentalAnchorY(pitch) * accidentalScale;

        return (
            <g
                className={styles.note}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? `Select ${which} note ${formatPitch(pitch)}` : undefined}
                aria-pressed={interactive ? interaction.selectedNote === which : undefined}
                data-staff-position={position}
                data-selected={interaction.selectedNote === which || undefined}
                data-dragging={interaction.draggingNote === which || undefined}
                onClick={interactive ? event => {
                    event.stopPropagation();
                    interaction.setSelectedNote(which);
                } : undefined}
                onKeyDown={interactive ? handleNoteKeyDown(which) : undefined}
                onPointerDown={interactive ? event => interaction.startDrag(event, which) : undefined}
                onPointerMove={interactive ? interaction.moveDrag : undefined}
                onPointerUp={interactive ? interaction.finishDrag : undefined}
                onPointerCancel={interactive ? interaction.cancelDrag : undefined}
                onLostPointerCapture={interactive ? interaction.cancelDrag : undefined}
            >
                {interactive ? (
                    <ellipse
                        className={styles.noteHitTarget}
                        data-note-hit-target=""
                        cx={x}
                        cy={noteY}
                        rx={noteHitRx}
                        ry={noteHitRy}
                    />
                ) : null}
                <ellipse
                    className={styles.selectionHalo}
                    data-selection-halo=""
                    cx={x}
                    cy={noteY}
                    rx={noteRx * 1.55}
                    ry={noteRy * 1.7}
                />
                {accidentalGlyph ? (
                    <g
                        data-accidental=""
                        transform={`translate(${accidentalX}, ${accidentalY}) scale(${accidentalScale})`}
                    >
                        <path className={styles.accidental} d={pathToSvgD(accidentalGlyph.commands)} />
                    </g>
                ) : null}
                <ellipse
                    className={styles.notehead}
                    data-notehead=""
                    cx={x}
                    cy={noteY}
                    rx={noteRx}
                    ry={noteRy}
                />
                {ledgers.map(ledgerPosition => (
                    <line
                        key={ledgerPosition}
                        className={styles.ledgerLine}
                        data-ledger-line=""
                        x1={x - ledgerHalfWidth}
                        x2={x + ledgerHalfWidth}
                        y1={y(ledgerPosition)}
                        y2={y(ledgerPosition)}
                    />
                ))}
            </g>
        );
    };

    return (
        <div className={clsx(styles.widget, className)}>
            {interactive ? (
                <VocalRangeHeader
                    low={displayLow}
                    high={displayHigh}
                    selectedNote={interaction.selectedNote}
                    onSelect={interaction.setSelectedNote}
                />
            ) : null}
            <svg
                className={styles.root}
                viewBox={`0 0 ${staffEndX + STAFF_RIGHT_MARGIN} ${height}`}
                width={staffEndX + STAFF_RIGHT_MARGIN}
                height={height}
                role={interactive ? 'group' : 'img'}
                aria-label="Vocal range staff"
            >
                {STAFF_LINE_POSITIONS.map(position => (
                    <line
                        key={position}
                        className={styles.staffLine}
                        data-staff-line=""
                        data-position={position}
                        x1={staffStartX}
                        x2={staffEndX}
                        y1={y(position)}
                        y2={y(position)}
                    />
                ))}
                <g
                    data-clef={clef}
                    transform={`translate(${staffStartX + CLEF_INSET}, ${clefY}) scale(${clefScale})`}
                >
                    <path className={styles.clef} d={pathToSvgD(clefGlyph.commands)} />
                </g>
                {displayLow && displayHigh && lowPosition !== null && highPosition !== null ? (
                    <line
                        className={styles.connector}
                        data-range-connector=""
                        x1={lowX + noteRx + CONNECTOR_GAP}
                        x2={highX - noteRx - CONNECTOR_GAP - highAccidentalClearance}
                        y1={y(lowPosition)}
                        y2={y(highPosition)}
                    />
                ) : null}
                {renderNote('low', displayLow, lowPosition, lowX, lowLedgers)}
                {renderNote('high', displayHigh, highPosition, highX, highLedgers)}
            </svg>
            {interactive && interaction.selectedNote ? (
                <VocalRangeNoteControls
                    which={interaction.selectedNote}
                    pitch={interaction.pitchOf(interaction.selectedNote)}
                    canAdjustOctave={interaction.canAdjustOctave}
                    canToggleAccidental={interaction.canToggleAccidental}
                    onAdjustOctave={interaction.adjustOctave}
                    onToggleAccidental={interaction.toggleAccidental}
                />
            ) : null}
        </div>
    );
};

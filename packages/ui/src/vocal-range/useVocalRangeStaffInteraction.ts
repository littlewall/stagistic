import {
    type Clef,
    type Pitch,
} from '@stagistic/script';
import {
    type PointerEvent,
    useRef,
    useState,
} from 'react';

import {
    constrainStaffPitch,
    isPitchAllowed,
} from './vocalRangeConstraints';
import type {VocalRangeNote} from './VocalRangeStaff.types';

const DEFAULT_PITCH: Pitch = {
    step: 'C', alter: 0, octave: 4,
};

export const INTERACTIVE_MIN_POSITION = -4;
export const INTERACTIVE_MAX_POSITION = 12;

const DRAG_THRESHOLD_PX = 4;

interface DragState {
    pointerId: number,
    startClientY: number,
    hasMoved: boolean,
    which: VocalRangeNote,
    originalPitch: Pitch,
    pitch: Pitch,
}

interface InteractionOptions {
    low: Pitch | null,
    high: Pitch | null,
    clef: Clef,
    viewBoxHeight: number,
    maxPosition: number,
    unitPx: number,
    verticalMargin: number,
    onChange?: (which: VocalRangeNote, pitch: Pitch) => void,
}

const pitchesEqual = (left: Pitch, right: Pitch) => left.step === right.step
    && left.alter === right.alter
    && left.octave === right.octave;

export const useVocalRangeStaffInteraction = ({
    low,
    high,
    clef,
    viewBoxHeight,
    maxPosition,
    unitPx,
    verticalMargin,
    onChange,
}: InteractionOptions) => {
    const [selectedNote, setSelectedNote] = useState<VocalRangeNote | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const dragStateRef = useRef<DragState | null>(null);

    const setDrag = (next: DragState | null) => {
        dragStateRef.current = next;
        setDragState(next);
    };
    const pitchOf = (which: VocalRangeNote) => {
        if (dragState?.which === which) {
            return dragState.pitch;
        }

        return (which === 'low' ? low : high) ?? DEFAULT_PITCH;
    };
    const pitchAtPointer = (
        event: PointerEvent<SVGGElement>,
        which: VocalRangeNote,
        fallback: Pitch,
    ) => {
        const svg = event.currentTarget.ownerSVGElement;
        const rect = svg?.getBoundingClientRect();

        if (!rect || rect.height === 0) {
            return null;
        }

        const localY = (event.clientY - rect.top) * (viewBoxHeight / rect.height);
        const rawPosition = Math.round(maxPosition - (localY - verticalMargin) / unitPx);
        const position = Math.min(
            INTERACTIVE_MAX_POSITION,
            Math.max(INTERACTIVE_MIN_POSITION, rawPosition),
        );

        return constrainStaffPitch({
            which,
            position,
            alter: fallback.alter,
            clef,
            minPosition: INTERACTIVE_MIN_POSITION,
            maxPosition: INTERACTIVE_MAX_POSITION,
            fallback,
            low,
            high,
        });
    };
    const octavePitch = (which: VocalRangeNote, delta: 1 | -1): Pitch => {
        const current = pitchOf(which);

        return {...current, octave: current.octave + delta};
    };
    const accidentalPitch = (which: VocalRangeNote, target: 1 | -1): Pitch => {
        const current = pitchOf(which);

        return {...current, alter: current.alter === target ? 0 : target};
    };
    const adjustOctave = (which: VocalRangeNote, delta: 1 | -1) => {
        const next = octavePitch(which, delta);

        if (onChange && isPitchAllowed(which, next, {low, high})) {
            onChange(which, next);
        }
    };
    const toggleAccidental = (which: VocalRangeNote, target: 1 | -1) => {
        const next = accidentalPitch(which, target);

        if (onChange && isPitchAllowed(which, next, {low, high})) {
            onChange(which, next);
        }
    };
    const startDrag = (event: PointerEvent<SVGGElement>, which: VocalRangeNote) => {
        if (event.button !== 0) {
            return;
        }

        event.stopPropagation();

        const originalPitch = pitchOf(which);
        const next: DragState = {
            pointerId: event.pointerId,
            startClientY: event.clientY,
            hasMoved: false,
            which,
            originalPitch,
            pitch: originalPitch,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        setSelectedNote(which);
        setDrag(next);
    };
    const moveDrag = (event: PointerEvent<SVGGElement>) => {
        const current = dragStateRef.current;

        if (!current || current.pointerId !== event.pointerId) {
            return;
        }

        const hasMoved = current.hasMoved
            || Math.abs(event.clientY - current.startClientY) >= DRAG_THRESHOLD_PX;

        if (!hasMoved) {
            return;
        }

        const pitch = pitchAtPointer(event, current.which, current.originalPitch);

        if (pitch && (!current.hasMoved || !pitchesEqual(pitch, current.pitch))) {
            setDrag({
                ...current, hasMoved: true, pitch,
            });
        }
    };
    const finishDrag = (event: PointerEvent<SVGGElement>) => {
        const current = dragStateRef.current;

        if (!current || current.pointerId !== event.pointerId) {
            return;
        }

        const hasMoved = current.hasMoved
            || Math.abs(event.clientY - current.startClientY) >= DRAG_THRESHOLD_PX;

        event.currentTarget.releasePointerCapture(event.pointerId);
        setDrag(null);

        if (!hasMoved) {
            return;
        }

        const pitch = pitchAtPointer(event, current.which, current.originalPitch) ?? current.pitch;

        if (!pitchesEqual(pitch, current.originalPitch)) {
            onChange?.(current.which, pitch);
        }
    };
    const cancelDrag = (event: PointerEvent<SVGGElement>) => {
        const current = dragStateRef.current;

        if (!current || current.pointerId !== event.pointerId) {
            return;
        }

        setDrag(null);
    };

    return {
        selectedNote,
        setSelectedNote,
        draggingNote: dragState?.which ?? null,
        displayLow: dragState?.which === 'low' ? dragState.pitch : low,
        displayHigh: dragState?.which === 'high' ? dragState.pitch : high,
        pitchOf,
        canAdjustOctave: (which: VocalRangeNote, delta: 1 | -1) => isPitchAllowed(which, octavePitch(which, delta), {low, high}),
        canToggleAccidental: (which: VocalRangeNote, target: 1 | -1) => isPitchAllowed(which, accidentalPitch(which, target), {low, high}),
        adjustOctave,
        toggleAccidental,
        startDrag,
        moveDrag,
        finishDrag,
        cancelDrag,
    };
};

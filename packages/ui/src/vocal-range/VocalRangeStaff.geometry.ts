import type {Pitch} from '@stagistic/script';

export const UNIT_PX = 5;
export const STAFF_LINE_POSITIONS = [
    0,
    2,
    4,
    6,
    8,
];
export const STAFF_LEFT_MARGIN = 32;
export const STAFF_RIGHT_MARGIN = 32;
export const STAFF_WIDTH = 464;
export const CLEF_INSET = 4;
export const CLEF_ANCHOR_Y = 1098;
export const LOW_NOTE_FRACTION = 0.22;
export const HIGH_NOTE_FRACTION = 0.78;
export const VERTICAL_MARGIN = 18;
export const MANAGER_RESIZE_COMPENSATION = 70 / 60;
export const NOTEHEAD_RX = UNIT_PX * 1.6;
export const NOTEHEAD_RY = UNIT_PX * 1.2;
export const CONNECTOR_GAP = 12;
export const ACCIDENTAL_NOTE_GAP = 3;

const ACCIDENTAL_HEIGHT_PX = UNIT_PX * 4;
const FLAT_VISUAL_SCALE = 1.5;
const ACCIDENTAL_CENTER_Y = 10;
const FLAT_BOWL_CENTER_Y = 13;

export const accidentalHeight = (pitch: Pitch | null) => ACCIDENTAL_HEIGHT_PX
    * (pitch?.alter === -1 ? FLAT_VISUAL_SCALE : 1);

export const accidentalAnchorY = (pitch: Pitch) => {
    return pitch.alter === -1
        ? FLAT_BOWL_CENTER_Y
        : ACCIDENTAL_CENTER_Y;
};

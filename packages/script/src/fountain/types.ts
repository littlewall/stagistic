export const ELEMENT_SCENE_HEADING = 'fountain_scene_heading';
export const ELEMENT_ACT = 'fountain_act';
export const ELEMENT_STAGE_DIRECTIONS = 'fountain_action';
export const ELEMENT_CHARACTER = 'fountain_character';
export const ELEMENT_ASIDE = 'fountain_parenthetical';
export const ELEMENT_DIALOGUE = 'fountain_dialogue';
export const ELEMENT_LYRICS = 'fountain_lyrics';
export const ELEMENT_NOTE = 'fountain_note';
export const ELEMENT_COLUMN_GROUP = 'column_group';
export const ELEMENT_COLUMN = 'column';

export type FountainElementType =
    | typeof ELEMENT_SCENE_HEADING
    | typeof ELEMENT_ACT
    | typeof ELEMENT_STAGE_DIRECTIONS
    | typeof ELEMENT_CHARACTER
    | typeof ELEMENT_ASIDE
    | typeof ELEMENT_DIALOGUE
    | typeof ELEMENT_LYRICS
    | typeof ELEMENT_NOTE;

export type FountainText = {
    text: string,
    bold?: boolean,
    italic?: boolean,
    underline?: boolean,
};

export type FountainElement = {
    type: FountainElementType,
    children: FountainText[],
};

export type ColumnElement = {
    type: typeof ELEMENT_COLUMN,
    width?: string,
    children: FountainElement[],
};

export type ColumnGroupElement = {
    type: typeof ELEMENT_COLUMN_GROUP,
    children: ColumnElement[],
};

export type FountainNode = FountainElement | ColumnElement | ColumnGroupElement;

export type FountainDocument = FountainNode[];

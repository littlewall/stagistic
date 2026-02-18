export const ELEMENT_SCENE_HEADING = 'fountain_scene_heading';
export const ELEMENT_ACT = 'fountain_act';
export const ELEMENT_ACTION = 'fountain_action';
export const ELEMENT_CHARACTER = 'fountain_character';
export const ELEMENT_DUAL_DIALOGUE_CHARACTER = 'fountain_dual_dialogue_character';
export const ELEMENT_PARENTHETICAL = 'fountain_parenthetical';
export const ELEMENT_DIALOGUE = 'fountain_dialogue';
export const ELEMENT_DUAL_DIALOGUE = 'fountain_dual_dialogue';
export const ELEMENT_TRANSITION = 'fountain_transition';
export const ELEMENT_LYRICS = 'fountain_lyrics';
export const ELEMENT_NOTE = 'fountain_note';
export const ELEMENT_COLUMN_GROUP = 'column_group';
export const ELEMENT_COLUMN = 'column';

export const FountainNodeType = {
    sceneHeading: ELEMENT_SCENE_HEADING,
    act: ELEMENT_ACT,
    action: ELEMENT_ACTION,
    character: ELEMENT_CHARACTER,
    parenthetical: ELEMENT_PARENTHETICAL,
    dialogue: ELEMENT_DIALOGUE,
    dualDialogue: ELEMENT_DUAL_DIALOGUE,
    dualDialogueCharacter: ELEMENT_DUAL_DIALOGUE_CHARACTER,
    transition: ELEMENT_TRANSITION,
    lyric: ELEMENT_LYRICS,
    note: ELEMENT_NOTE,
    section: 'fountain_section',
    synopsis: 'fountain_synopsis',
    pageBreak: 'fountain_page_break',
    boneyard: 'fountain_boneyard',
    dialogueBlock: 'fountain_dialogue_block',
    titlePage: 'fountain_title_page',
    titlePageField: 'fountain_title_page_field',
} as const;

export type FountainNodeTypeKey = keyof typeof FountainNodeType;
export type FountainNodeTypeValue = (typeof FountainNodeType)[FountainNodeTypeKey];

export type FountainElementType =
    | typeof ELEMENT_SCENE_HEADING
    | typeof ELEMENT_ACT
    | typeof ELEMENT_ACTION
    | typeof ELEMENT_CHARACTER
    | typeof ELEMENT_DUAL_DIALOGUE_CHARACTER
    | typeof ELEMENT_PARENTHETICAL
    | typeof ELEMENT_DIALOGUE
    | typeof ELEMENT_DUAL_DIALOGUE
    | typeof ELEMENT_TRANSITION
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

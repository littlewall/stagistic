import {
  ELEMENT_ACTION,
  ELEMENT_CHARACTER,
  ELEMENT_CENTERED,
  ELEMENT_DIALOGUE,
  ELEMENT_DUAL_DIALOGUE_CHARACTER,
  ELEMENT_LYRICS,
  ELEMENT_PARENTHETICAL,
  ELEMENT_SCENE_HEADING,
  ELEMENT_TRANSITION,
  type FountainElementType,
} from '@stagistic/editor-core';

export const FOUNTAIN_BLOCKS: { type: FountainElementType; label: string }[] = [
  { type: ELEMENT_SCENE_HEADING, label: 'Scene heading' },
  { type: ELEMENT_ACTION, label: 'Action' },
  { type: ELEMENT_CHARACTER, label: 'Character' },
  { type: ELEMENT_DUAL_DIALOGUE_CHARACTER, label: 'Character (dual dialogue)' },
  { type: ELEMENT_PARENTHETICAL, label: 'Parenthetical' },
  { type: ELEMENT_DIALOGUE, label: 'Dialogue' },
  { type: ELEMENT_TRANSITION, label: 'Transition' },
  { type: ELEMENT_LYRICS, label: 'Lyrics' },
  { type: ELEMENT_CENTERED, label: 'Centered text' },
];

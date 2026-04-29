import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_SECTION,
    ELEMENT_TRANSITION,
} from '@stagistic/script';
import clsx from 'clsx';

import baseStyles from '../base/FountainBlock.module.css';
import actStyles from '../styles/ActBlock.module.css';
import actionStyles from '../styles/ActionBlock.module.css';
import characterStyles from '../styles/CharacterBlock.module.css';
import dialogueStyles from '../styles/DialogueBlock.module.css';
import dualCharacterStyles from '../styles/DualCharacterBlock.module.css';
import lyricsStyles from '../styles/LyricsBlock.module.css';
import noteStyles from '../styles/NoteBlock.module.css';
import parentheticalStyles from '../styles/ParentheticalBlock.module.css';
import sceneStyles from '../styles/SceneHeadingBlock.module.css';
import sectionStyles from '../styles/SectionBlock.module.css';
import transitionStyles from '../styles/TransitionBlock.module.css';
import type {FountainBlockType} from './blockTypes';

const BLOCK_TYPE_CLASS_NAMES: Record<FountainBlockType, string> = {
    [ELEMENT_SCENE_HEADING]: sceneStyles.scene,
    [ELEMENT_ACT]: actStyles.act,
    [ELEMENT_SECTION]: sectionStyles.section,
    [ELEMENT_ACTION]: actionStyles.action,
    [ELEMENT_CHARACTER]: characterStyles.character,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: dualCharacterStyles.dualCharacter,
    [ELEMENT_PARENTHETICAL]: parentheticalStyles.parenthetical,
    [ELEMENT_DIALOGUE]: dialogueStyles.dialogue,
    [ELEMENT_TRANSITION]: transitionStyles.transition,
    [ELEMENT_LYRICS]: lyricsStyles.lyrics,
    [ELEMENT_NOTE]: noteStyles.note,
};

export const getFountainBlockClassName = (blockType: FountainBlockType) => clsx(
    baseStyles.block,
    BLOCK_TYPE_CLASS_NAMES[blockType],
);

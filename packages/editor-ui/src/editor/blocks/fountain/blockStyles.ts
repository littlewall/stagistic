import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
} from '@stagistic/editor-core';

import baseStyles from '../base/FountainBlock.module.css';
import actionStyles from '../elements/ActionBlock/ActionBlock.module.css';
import centeredStyles from '../elements/CenteredBlock/CenteredBlock.module.css';
import characterStyles from '../elements/CharacterBlock/CharacterBlock.module.css';
import dialogueStyles from '../elements/DialogueBlock/DialogueBlock.module.css';
import dualCharacterStyles from '../elements/DualCharacterBlock/DualCharacterBlock.module.css';
import lyricsStyles from '../elements/LyricsBlock/LyricsBlock.module.css';
import parentheticalStyles from '../elements/ParentheticalBlock/ParentheticalBlock.module.css';
import sceneStyles from '../elements/SceneHeadingBlock/SceneHeadingBlock.module.css';
import transitionStyles from '../elements/TransitionBlock/TransitionBlock.module.css';
import type {FountainBlockType} from './blockTypes';

const joinClassNames = (...classNames: Array<string | undefined>) => classNames
    .filter(Boolean)
    .join(' ');

const BLOCK_TYPE_CLASS_NAMES: Record<FountainBlockType, string> = {
    [ELEMENT_SCENE_HEADING]: sceneStyles.scene,
    [ELEMENT_ACTION]: actionStyles.action,
    [ELEMENT_CHARACTER]: joinClassNames(characterStyles.characterBlock, characterStyles.character),
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: joinClassNames(
        dualCharacterStyles.dualCharacterBlock,
        dualCharacterStyles.dualCharacter,
    ),
    [ELEMENT_PARENTHETICAL]: parentheticalStyles.parenthetical,
    [ELEMENT_DIALOGUE]: dialogueStyles.dialogue,
    [ELEMENT_TRANSITION]: joinClassNames(transitionStyles.transitionBlock, transitionStyles.transition),
    [ELEMENT_LYRICS]: lyricsStyles.lyrics,
    [ELEMENT_CENTERED]: centeredStyles.centered,
};

export const getFountainBlockClassName = (blockType: FountainBlockType) => joinClassNames(
    baseStyles.block,
    baseStyles.content,
    BLOCK_TYPE_CLASS_NAMES[blockType],
);

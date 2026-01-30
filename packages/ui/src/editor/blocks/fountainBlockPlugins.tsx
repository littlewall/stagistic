import {ColumnItemPlugin, ColumnPlugin} from '@platejs/layout/react';
import {BlockSelectionPlugin} from '@platejs/selection/react';

import {actionPlugin} from './elements/ActionBlock/ActionBlockPlugin';
import {centeredPlugin} from './elements/CenteredBlock/CenteredBlockPlugin';
import {characterPlugin} from './elements/CharacterBlock/CharacterBlockPlugin';
import {dialoguePlugin} from './elements/DialogueBlock/DialogueBlockPlugin';
import {dualCharacterPlugin} from './elements/DualCharacterBlock/DualCharacterBlockPlugin';
import {dualDialoguePlugin} from './elements/DualDialogueBlock/DualDialogueBlockPlugin';
import {lyricsPlugin} from './elements/LyricsBlock/LyricsBlockPlugin';
import {parentheticalPlugin} from './elements/ParentheticalBlock/ParentheticalBlockPlugin';
import {sceneHeadingPlugin} from './elements/SceneHeadingBlock/SceneHeadingBlockPlugin';
import {transitionPlugin} from './elements/TransitionBlock/TransitionBlockPlugin';
import {ColumnGroup, ColumnItem} from './layout/ColumnGroup';

export const createFountainPlugins = () => [
    ColumnPlugin.withComponent(ColumnGroup),
    ColumnItemPlugin.withComponent(ColumnItem),
    sceneHeadingPlugin,
    actionPlugin,
    characterPlugin,
    dualCharacterPlugin,
    parentheticalPlugin,
    dialoguePlugin,
    dualDialoguePlugin,
    transitionPlugin,
    lyricsPlugin,
    centeredPlugin,
    BlockSelectionPlugin,
];

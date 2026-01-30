import {ColumnItemPlugin, ColumnPlugin} from '@platejs/layout/react';
import {BlockSelectionPlugin} from '@platejs/selection/react';

import {actionPlugin} from '~blocks/elements/ActionBlock/ActionBlockPlugin';
import {centeredPlugin} from '~blocks/elements/CenteredBlock/CenteredBlockPlugin';
import {characterPlugin} from '~blocks/elements/CharacterBlock/CharacterBlockPlugin';
import {dialoguePlugin} from '~blocks/elements/DialogueBlock/DialogueBlockPlugin';
import {dualCharacterPlugin} from '~blocks/elements/DualCharacterBlock/DualCharacterBlockPlugin';
import {dualDialoguePlugin} from '~blocks/elements/DualDialogueBlock/DualDialogueBlockPlugin';
import {lyricsPlugin} from '~blocks/elements/LyricsBlock/LyricsBlockPlugin';
import {parentheticalPlugin} from '~blocks/elements/ParentheticalBlock/ParentheticalBlockPlugin';
import {sceneHeadingPlugin} from '~blocks/elements/SceneHeadingBlock/SceneHeadingBlockPlugin';
import {transitionPlugin} from '~blocks/elements/TransitionBlock/TransitionBlockPlugin';
import {ColumnGroup, ColumnItem} from '~blocks/layout/ColumnGroup';

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

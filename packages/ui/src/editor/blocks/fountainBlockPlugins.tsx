import {ColumnItemPlugin, ColumnPlugin} from '@platejs/layout/react';
import {BlockSelectionPlugin} from '@platejs/selection/react';
import {createNodeId} from '@stagistic/shared';
import {NodeIdPlugin} from 'platejs';
import {createPlatePlugin} from 'platejs/react';

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

const tabFallbackPlugin = createPlatePlugin({
    key: 'fountain-tab-fallback',
    handlers: {
        onKeyDown: ({event}) => {
            if (event.key !== 'Tab') {
                return undefined;
            }

            event.preventDefault();

            return true;
        },
    },
});

export const createFountainPlugins = () => [
    NodeIdPlugin.configure({
        options: {
            idCreator: createNodeId,
            normalizeInitialValue: true,
        },
    }),
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
    tabFallbackPlugin,
];

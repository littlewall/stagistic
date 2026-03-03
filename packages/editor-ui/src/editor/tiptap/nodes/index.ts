import {
    SCRIPT_BLOCK_NODE_TYPES,
    type ScriptBlockNodeType,
} from '@stagistic/script-core';

import {ActionNode} from './actionNode';
import {ActNode} from './actNode';
import {CharacterNode} from './characterNode';
import {DialogueNode} from './dialogueNode';
import {DualDialogueCharacterNode} from './dualDialogueCharacterNode';
import {LyricsNode} from './lyricsNode';
import {NoteNode} from './noteNode';
import {ParentheticalNode} from './parentheticalNode';
import {SceneHeadingNode} from './sceneHeadingNode';
import {SectionNode} from './sectionNode';
import {TransitionNode} from './transitionNode';

export const SCRIPT_BLOCK_NODE_NAMES: readonly ScriptBlockNodeType[] = SCRIPT_BLOCK_NODE_TYPES;

export const FountainBlockNodes = [
    SceneHeadingNode,
    ActNode,
    SectionNode,
    ActionNode,
    CharacterNode,
    DialogueNode,
    ParentheticalNode,
    TransitionNode,
    LyricsNode,
    NoteNode,
    DualDialogueCharacterNode,
] as const;

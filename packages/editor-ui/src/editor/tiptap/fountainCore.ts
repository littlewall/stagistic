import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/editor-core';
import {
    createNodeId,
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
} from '@stagistic/shared';
import type {Node as ProseMirrorNode, ResolvedPos} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import baseStyles from '../blocks/base/FountainBlock.module.css';
import actionStyles from '../blocks/elements/ActionBlock/ActionBlock.module.css';
import centeredStyles from '../blocks/elements/CenteredBlock/CenteredBlock.module.css';
import characterStyles from '../blocks/elements/CharacterBlock/CharacterBlock.module.css';
import dialogueStyles from '../blocks/elements/DialogueBlock/DialogueBlock.module.css';
import dualCharacterStyles from '../blocks/elements/DualCharacterBlock/DualCharacterBlock.module.css';
import lyricsStyles from '../blocks/elements/LyricsBlock/LyricsBlock.module.css';
import parentheticalStyles from '../blocks/elements/ParentheticalBlock/ParentheticalBlock.module.css';
import sceneStyles from '../blocks/elements/SceneHeadingBlock/SceneHeadingBlock.module.css';
import transitionStyles from '../blocks/elements/TransitionBlock/TransitionBlock.module.css';

export {
    FOUNTAIN_BLOCK_NODE_NAME,
    FOUNTAIN_COLUMN_GROUP_NODE_NAME,
    FOUNTAIN_COLUMN_NODE_NAME,
};

export const FOUNTAIN_BLOCK_TYPES = [
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_CENTERED,
] as const;

export type FountainBlockType = (typeof FOUNTAIN_BLOCK_TYPES)[number];

const FOUNTAIN_BLOCK_TYPE_SET = new Set<FountainBlockType>(FOUNTAIN_BLOCK_TYPES);

const ENTER_NEXT_TYPE: Partial<Record<FountainBlockType, FountainBlockType>> = {
    [ELEMENT_SCENE_HEADING]: ELEMENT_ACTION,
    [ELEMENT_ACTION]: ELEMENT_ACTION,
    [ELEMENT_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: ELEMENT_DIALOGUE,
    [ELEMENT_PARENTHETICAL]: ELEMENT_CHARACTER,
    [ELEMENT_DIALOGUE]: ELEMENT_CHARACTER,
    [ELEMENT_TRANSITION]: ELEMENT_SCENE_HEADING,
};

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

const DEFAULT_BLOCK_TYPE: FountainBlockType = ELEMENT_ACTION;

export type ActiveFountainBlock = {
    pos: number,
    from: number,
    to: number,
    node: ProseMirrorNode,
    blockType: FountainBlockType,
    id: string,
};

export const isFountainBlockType = (value: unknown): value is FountainBlockType => {
    return typeof value === 'string' && FOUNTAIN_BLOCK_TYPE_SET.has(value as FountainBlockType);
};

export const normalizeFountainBlockType = (value: unknown): FountainBlockType => {
    if (value === ELEMENT_DUAL_DIALOGUE) {
        return ELEMENT_DIALOGUE;
    }

    return isFountainBlockType(value) ? value : DEFAULT_BLOCK_TYPE;
};

export const ensureFountainBlockId = (value: unknown) => {
    return typeof value === 'string' && value.length > 0 ? value : createNodeId();
};

export const getNextTypeOnEnter = (type: FountainBlockType) => ENTER_NEXT_TYPE[type] ?? type;

export const getFountainBlockClassName = (blockType: FountainBlockType) => joinClassNames(
    baseStyles.block,
    baseStyles.content,
    BLOCK_TYPE_CLASS_NAMES[blockType],
);

const getFountainBlockAtResolvedPosition = (
    $position: ResolvedPos,
    nodeName: string,
): ActiveFountainBlock | null => {
    for (let depth = $position.depth; depth > 0; depth -= 1) {
        const node = $position.node(depth);

        if (node.type.name !== nodeName) {
            continue;
        }

        const pos = $position.before(depth);

        return {
            pos,
            from: pos + 1,
            to: pos + node.nodeSize - 1,
            node,
            blockType: normalizeFountainBlockType(node.attrs.blockType),
            id: ensureFountainBlockId(node.attrs.id),
        };
    }

    return null;
};

export const getActiveFountainBlockFromState = (
    state: EditorState,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => getFountainBlockAtResolvedPosition(state.selection.$from, nodeName);

export const getSelectionBlockEntries = (
    state: EditorState,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => ({
    anchor: getFountainBlockAtResolvedPosition(state.selection.$anchor, nodeName),
    head: getFountainBlockAtResolvedPosition(state.selection.$head, nodeName),
});

export const isSelectionAcrossBlocks = (
    state: EditorState,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => {
    if (state.selection.empty) {
        return false;
    }

    const {anchor, head} = getSelectionBlockEntries(state, nodeName);

    if (!anchor || !head) {
        return false;
    }

    return anchor.pos !== head.pos;
};

export const getActiveFountainBlock = (
    editor: TiptapEditor,
    nodeName = FOUNTAIN_BLOCK_NODE_NAME,
) => getActiveFountainBlockFromState(editor.state, nodeName);

export const isFountainElementType = (value: unknown): value is FountainElementType => isFountainBlockType(value);

import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_SECTION,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from './types';

/**
 * TipTap node type names for the rewrite schema (D2/D9).
 */
export const SCRIPT_BLOCK_TYPE_BY_NODE_TYPE = {
    sceneHeading: 'scene_heading',
    act: 'act',
    section: 'section',
    action: 'action',
    character: 'character',
    dualDialogueCharacter: 'dual_dialogue_character',
    parenthetical: 'parenthetical',
    dialogue: 'dialogue',
    transition: 'transition',
    lyrics: 'lyrics',
    note: 'note',
} as const;

export type ScriptBlockNodeType = keyof typeof SCRIPT_BLOCK_TYPE_BY_NODE_TYPE;
export type ScriptBlockType = (typeof SCRIPT_BLOCK_TYPE_BY_NODE_TYPE)[ScriptBlockNodeType];

export const LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE: Record<ScriptBlockNodeType, FountainElementType> = {
    sceneHeading: ELEMENT_SCENE_HEADING,
    act: ELEMENT_ACT,
    section: ELEMENT_SECTION,
    action: ELEMENT_ACTION,
    character: ELEMENT_CHARACTER,
    dualDialogueCharacter: ELEMENT_DUAL_DIALOGUE_CHARACTER,
    parenthetical: ELEMENT_PARENTHETICAL,
    dialogue: ELEMENT_DIALOGUE,
    transition: ELEMENT_TRANSITION,
    lyrics: ELEMENT_LYRICS,
    note: ELEMENT_NOTE,
};

const SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE: Record<ScriptBlockType, ScriptBlockNodeType> = {
    scene_heading: 'sceneHeading',
    act: 'act',
    section: 'section',
    action: 'action',
    character: 'character',
    dual_dialogue_character: 'dualDialogueCharacter',
    parenthetical: 'parenthetical',
    dialogue: 'dialogue',
    transition: 'transition',
    lyrics: 'lyrics',
    note: 'note',
};

const SCRIPT_BLOCK_NODE_TYPE_BY_LEGACY_FOUNTAIN_BLOCK_TYPE: Record<FountainElementType, ScriptBlockNodeType> = {
    [ELEMENT_SCENE_HEADING]: 'sceneHeading',
    [ELEMENT_ACT]: 'act',
    [ELEMENT_SECTION]: 'section',
    [ELEMENT_ACTION]: 'action',
    [ELEMENT_CHARACTER]: 'character',
    [ELEMENT_DUAL_DIALOGUE]: 'dialogue',
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: 'dualDialogueCharacter',
    [ELEMENT_PARENTHETICAL]: 'parenthetical',
    [ELEMENT_DIALOGUE]: 'dialogue',
    [ELEMENT_TRANSITION]: 'transition',
    [ELEMENT_LYRICS]: 'lyrics',
    [ELEMENT_NOTE]: 'note',
};

const SCRIPT_BLOCK_NODE_TYPE_SET: ReadonlySet<string> = new Set(Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));
const SCRIPT_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));
const LEGACY_FOUNTAIN_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(
    Object.values(LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE),
);

export const SCRIPT_BLOCK_NODE_TYPES: ScriptBlockNodeType[] = Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE) as ScriptBlockNodeType[];
export const SCRIPT_BLOCK_TYPES: ScriptBlockType[] = Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE);

export const isScriptBlockNodeType = (value: unknown): value is ScriptBlockNodeType => {
    return typeof value === 'string' && SCRIPT_BLOCK_NODE_TYPE_SET.has(value);
};

export const isScriptBlockType = (value: unknown): value is ScriptBlockType => {
    return typeof value === 'string' && SCRIPT_BLOCK_TYPE_SET.has(value);
};

export const isLegacyFountainBlockType = (value: unknown): value is FountainElementType => {
    return typeof value === 'string' && LEGACY_FOUNTAIN_BLOCK_TYPE_SET.has(value);
};

export const getScriptBlockNodeTypeFromBlockType = (blockType: ScriptBlockType): ScriptBlockNodeType => {
    return SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[blockType];
};

export const getScriptBlockTypeFromNodeType = (nodeType: ScriptBlockNodeType): ScriptBlockType => {
    return SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

export const getLegacyFountainBlockTypeFromNodeType = (nodeType: ScriptBlockNodeType): FountainElementType => {
    return LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

export const resolveScriptBlockNodeType = (value: unknown): ScriptBlockNodeType | null => {
    if (isScriptBlockNodeType(value)) {
        return value;
    }

    if (isScriptBlockType(value)) {
        return SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[value];
    }

    if (isLegacyFountainBlockType(value)) {
        return SCRIPT_BLOCK_NODE_TYPE_BY_LEGACY_FOUNTAIN_BLOCK_TYPE[value];
    }

    return null;
};

export const resolveScriptBlockType = (value: unknown): ScriptBlockType | null => {
    const nodeType = resolveScriptBlockNodeType(value);

    if (!nodeType) {
        return null;
    }

    return SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

export const resolveLegacyFountainBlockType = (value: unknown): FountainElementType | null => {
    const nodeType = resolveScriptBlockNodeType(value);

    if (!nodeType) {
        return null;
    }

    return LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

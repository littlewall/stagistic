/** Evidence from a cue or a tag in a stage direction. */
export type SceneBoardPresence = 'present';

export interface SceneBoardCatalogCharacter {
    id: string,
    key: string,
}

export interface SceneBoardCatalogGroup {
    id: string,
    key: string,
    memberIds: readonly string[],
}

/** Confirmed characters and groups the script knows; everything else is unconfirmed. */
export interface SceneBoardCatalog {
    characters: readonly SceneBoardCatalogCharacter[],
    groups: readonly SceneBoardCatalogGroup[],
}

export interface SceneBoardCharacter {
    /** Stable per scene and across scenes: the character id, or `key:<KEY>` when unconfirmed. */
    entryId: string,
    /** Null for an unconfirmed character (a key without a catalog record). */
    characterId: string | null,
    key: string,
    level: SceneBoardPresence,
    /** Rank of the character's first cue in the scene (0 = speaks first); null without a cue. */
    firstCue: number | null,
}

export interface SceneBoardScene {
    headingBlockId: string,
    /** Sequential across the whole script, as in the structure sidebar. */
    number: number,
    title: string,
    /** The act heading this scene sits under; null before the first act heading. */
    actBlockId: string | null,
    /** In order of first appearance. */
    characters: SceneBoardCharacter[],
}

export interface SceneBoardAct {
    /** The act heading block id; null for scenes that precede the first act heading. */
    actBlockId: string | null,
    name: string,
    scenes: SceneBoardScene[],
}

export interface SceneBoardModel {
    acts: SceneBoardAct[],
}

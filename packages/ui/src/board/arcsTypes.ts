import type {BoardCharacterActions} from './BoardCharacterPopover';

/** One scene column of the chart, carrying its formatted number for the axis and tooltip. */
export interface BoardArcsScene {
    headingBlockId: string,
    /** The scene's number as the script renders it; empty when numbering is none. */
    number: string,
    title: string,
}

export interface BoardArcsAct {
    /** Unique per section; the act heading id, or a fixed key for the default act. */
    key: string,
    name: string,
    scenes: readonly BoardArcsScene[],
}

/** One arc point: the character's value in one scene. */
export interface BoardArcsPoint {
    headingBlockId: string,
    /** Index among all scene columns across every act. */
    sceneIndex: number,
    /** Stored arc value, or 0 (the baseline) for a note without one. */
    value: number,
    /** False for a note that has no arc value yet, shown at the baseline. */
    hasStoredValue: boolean,
    /** Script evidence (a cue or tag) places the character in the scene. */
    evidence: boolean,
    /** The scene card note, if any. */
    note: string | null,
}

export interface BoardArcsArc {
    id: string,
    name: string,
    color: string,
    points: readonly BoardArcsPoint[],
    /** Scene indices with script evidence, independent of user points. */
    presence?: readonly number[],
}

/** The writes of an editable Board; all absent on a snapshot or version, which only highlights. */
export interface BoardArcsEditing {
    onSetPoint?: (headingBlockId: string, characterId: string, value: number) => void,
    onRemovePoint?: (headingBlockId: string, characterId: string) => void,
    /** The scene card actions the point's popover shares with the Wall. */
    characterActions?: (headingBlockId: string) => BoardCharacterActions,
}

export interface BoardArcsProps extends BoardArcsEditing {
    /** Scenes grouped by act, as `buildArcsView` returns them. */
    acts: readonly BoardArcsAct[],
    /** One arc per confirmed, filtered character, in Matrix row order. */
    arcs: readonly BoardArcsArc[],
}

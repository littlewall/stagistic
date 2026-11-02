import {getConfirmedCharacterColor} from '@stagistic/editor';
import type {
    SceneBoardCharacter,
    SceneBoardScene,
    ScriptCharacterRecord,
} from '@stagistic/script';
import type {BoardCharacterChip} from '@stagistic/ui';

/** Unique key for scenes before any act. */
export const DEFAULT_ACT_KEY = '__default-act__';

/** What the user put on a card: a character, optionally with a note. */
export interface SceneCardRecord {
    headingBlockId: string,
    characterId: string,
    note: string | null,
}

/** The character's own color, else the one the editor shows for it. */
export const resolveCharacterColor = (
    record: ScriptCharacterRecord,
    displayColorByKey: ReadonlyMap<string, string>,
): string => record.colorHex ?? displayColorByKey.get(record.key) ?? getConfirmedCharacterColor(record.id, null);

/** Card records grouped per scene, in the order they were added. */
export const groupSceneRecords = (records: readonly SceneCardRecord[]) => {
    const byScene = new Map<string, SceneCardRecord[]>();

    records.forEach(record => byScene.set(record.headingBlockId, [...byScene.get(record.headingBlockId) ?? [], record]));

    return byScene;
};

/** What one scene says about its characters: their notes and script evidence. */
export interface SceneChipIndex {
    /** The record's note by character id; a present key means the card has the character. */
    noteById: ReadonlyMap<string, string | null>,
    /** Script evidence (a cue or a tag) by character id. */
    evidenceById: ReadonlyMap<string, SceneBoardCharacter>,
}

export const buildSceneChipIndex = (
    scene: SceneBoardScene,
    sceneRecords: readonly SceneCardRecord[],
): SceneChipIndex => ({
    noteById: new Map(sceneRecords.map(record => [record.characterId, record.note])),
    evidenceById: new Map(scene.characters.flatMap(character => (character.characterId ? [[character.characterId, character]] : []))),
});

export interface CharacterChipInput {
    id: string,
    characterId: string | null,
    /** Name to show when the character is not confirmed (no catalog record). */
    key: string,
    record?: ScriptCharacterRecord,
    note: string | null,
    source: BoardCharacterChip['source'],
    isDimmed?: boolean,
}

/** One chip of a card's cast, named and colored the same way on every lens. */
export const buildCharacterChip = (
    {
        id,
        characterId,
        key,
        record,
        note,
        source,
        isDimmed = false,
    }: CharacterChipInput,
    displayColorByKey: ReadonlyMap<string, string>,
): BoardCharacterChip => ({
    id,
    characterId,
    name: record?.key ?? key,
    color: record ? resolveCharacterColor(record, displayColorByKey) : null,
    source,
    note,
    isDimmed,
});

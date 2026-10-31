import {getConfirmedCharacterColor} from '@stagistic/editor';
import type {
    SceneBoardCharacter,
    SceneBoardModel,
    ScriptCharacterRecord,
} from '@stagistic/script';
import type {BoardCharacterChip} from '@stagistic/ui';

export interface WallScene {
    headingBlockId: string,
    number: number,
    title: string,
    page: number | null,
    /** The scene's outline; null when it has none. */
    synopsis: string | null,
    /** The filter leaves this scene out: it shrinks to one line. */
    isCollapsed: boolean,
    /** Characters with a note first (by first cue), then the rest from the script, then the rest only on the card. */
    chips: BoardCharacterChip[],
}

export interface WallAct {
    /** Unique per section; the act heading id, or a fixed key for the default act. */
    key: string,
    name: string,
    scenes: WallScene[],
}

/** What the user put on a card: a character, optionally with a note. */
export interface WallSceneRecord {
    headingBlockId: string,
    characterId: string,
    note: string | null,
}

export interface WallViewInput {
    model: SceneBoardModel,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
    getStartPage: (headingBlockId: string) => number | null,
    /** Card records in the order they were added. */
    records?: readonly WallSceneRecord[],
    synopsisByScene?: ReadonlyMap<string, string | null>,
    /** Filtered characters; empty filters nothing. */
    selectedIds: ReadonlySet<string>,
    /** Whether cards list characters. The filter counts them either way. */
    showOnStage: boolean,
}

export const DEFAULT_ACT_KEY = '__default-act__';

/** The character's own color, else the one the editor shows for it. */
export const resolveCharacterColor = (
    record: ScriptCharacterRecord,
    displayColorByKey: ReadonlyMap<string, string>,
): string => record.colorHex ?? displayColorByKey.get(record.key) ?? getConfirmedCharacterColor(record.id, null);

const groupRecordsByScene = (records: readonly WallSceneRecord[]) => {
    const byScene = new Map<string, WallSceneRecord[]>();

    records.forEach(record => byScene.set(record.headingBlockId, [...byScene.get(record.headingBlockId) ?? [], record]));

    return byScene;
};

/* Notes in the order the characters first speak; one who never speaks goes after those who do. */
const byFirstCue = (
    left: SceneBoardCharacter | undefined,
    right: SceneBoardCharacter | undefined,
) => (left?.firstCue ?? Infinity) - (right?.firstCue ?? Infinity);

/*
 * Shapes the model for the Wall. A character is on a card through the script (a cue or a
 * tag) or through a card record; a record without evidence shows hollow. Filtering never
 * hides a scene: scenes without a selected character collapse, so gaps stay visible.
 */
export const buildWallView = ({
    model,
    characters,
    displayColorByKey,
    getStartPage,
    records = [],
    synopsisByScene = new Map(),
    selectedIds,
    showOnStage,
}: WallViewInput): WallAct[] => {
    const recordById = new Map(characters.map(character => [character.id, character]));
    const recordsByScene = groupRecordsByScene(records.filter(record => recordById.has(record.characterId)));
    const isFiltering = selectedIds.size > 0;
    const isSelected = (characterId: string | null) => characterId !== null && selectedIds.has(characterId);

    return model.acts.map(act => ({
        key: act.actBlockId ?? DEFAULT_ACT_KEY,
        name: act.name,
        scenes: act.scenes.map(scene => {
            const sceneRecords = recordsByScene.get(scene.headingBlockId) ?? [];
            const noteById = new Map(sceneRecords.map(record => [record.characterId, record.note]));
            const evidenceById = new Map(scene.characters.flatMap(character => (character.characterId ? [[character.characterId, character]] : [])));
            const toChip = (id: string, characterId: string | null, key: string, source: BoardCharacterChip['source']): BoardCharacterChip => {
                const record = characterId ? recordById.get(characterId) : undefined;

                return {
                    id,
                    characterId,
                    name: record?.key ?? key,
                    color: record ? resolveCharacterColor(record, displayColorByKey) : null,
                    source,
                    note: (characterId && noteById.get(characterId)) || null,
                    isDimmed: isFiltering && !isSelected(characterId),
                };
            };
            const fromScript = scene.characters.map(character => toChip(character.entryId, character.characterId, character.key, 'script'));
            const onlyOnCard = sceneRecords
                .filter(record => !evidenceById.has(record.characterId))
                .map(record => toChip(record.characterId, record.characterId, '', 'card'));
            const all = [...fromScript, ...onlyOnCard];
            const withNote = all
                .filter(chip => chip.note)
                .toSorted((left, right) => byFirstCue(evidenceById.get(left.characterId ?? ''), evidenceById.get(right.characterId ?? '')));

            return {
                headingBlockId: scene.headingBlockId,
                number: scene.number,
                title: scene.title,
                page: getStartPage(scene.headingBlockId),
                synopsis: synopsisByScene.get(scene.headingBlockId) ?? null,
                isCollapsed: isFiltering && !all.some(chip => isSelected(chip.characterId)),
                chips: showOnStage ? [...withNote, ...all.filter(chip => !chip.note)] : [],
            };
        }),
    }));
};

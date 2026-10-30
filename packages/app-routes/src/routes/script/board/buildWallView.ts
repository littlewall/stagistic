import type {SceneBoardModel, ScriptCharacterRecord} from '@stagistic/script';
import type {BoardCharacterChip} from '@stagistic/ui';

export interface WallScene {
    headingBlockId: string,
    number: number,
    title: string,
    page: number | null,
    /** The filter leaves this scene out: it shrinks to one line. */
    isCollapsed: boolean,
    chips: BoardCharacterChip[],
}

export interface WallAct {
    /** Unique per section; the act heading id, or a fixed key for the default act. */
    key: string,
    name: string,
    scenes: WallScene[],
}

export interface WallViewInput {
    model: SceneBoardModel,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
    getStartPage: (headingBlockId: string) => number | null,
    /** Filtered characters; empty filters nothing. */
    selectedIds: ReadonlySet<string>,
    /** Whether chips list characters on stage. The filter counts them either way. */
    showOnStage: boolean,
}

export const DEFAULT_ACT_KEY = '__default-act__';

/** The character's own color, else the one the editor assigned to its key. */
export const resolveCharacterColor = (
    record: ScriptCharacterRecord,
    displayColorByKey: ReadonlyMap<string, string>,
): string | null => record.colorHex ?? displayColorByKey.get(record.key) ?? null;

/*
 * Shapes the model for the Wall. Filtering never hides a scene: scenes without a selected
 * character collapse, so gaps in a character's story stay visible.
 */
export const buildWallView = ({
    model,
    characters,
    displayColorByKey,
    getStartPage,
    selectedIds,
    showOnStage,
}: WallViewInput): WallAct[] => {
    const recordById = new Map(characters.map(character => [character.id, character]));
    const isFiltering = selectedIds.size > 0;

    return model.acts.map(act => ({
        key: act.actBlockId ?? DEFAULT_ACT_KEY,
        name: act.name,
        scenes: act.scenes.map(scene => {
            const counted = scene.characters;
            const matchesFilter = counted.some(character => character.characterId && selectedIds.has(character.characterId));
            const chips = (showOnStage ? counted : []).map<BoardCharacterChip>(character => {
                const record = character.characterId ? recordById.get(character.characterId) : undefined;

                return {
                    id: character.entryId,
                    name: character.key,
                    color: record ? resolveCharacterColor(record, displayColorByKey) : null,
                    level: character.level,
                    isDimmed: isFiltering && !(character.characterId && selectedIds.has(character.characterId)),
                };
            });

            return {
                headingBlockId: scene.headingBlockId,
                number: scene.number,
                title: scene.title,
                page: getStartPage(scene.headingBlockId),
                isCollapsed: isFiltering && !matchesFilter,
                chips,
            };
        }),
    }));
};

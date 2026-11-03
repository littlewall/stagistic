import {
    formatSceneNumber,
    type SceneBoardModel,
    type SceneNumberFormat,
    type ScriptCharacterRecord,
} from '@stagistic/script';
import type {
    BoardArcsAct,
    BoardArcsArc,
    BoardArcsPoint,
    BoardFilterCharacter,
} from '@stagistic/ui';

import {
    DEFAULT_ACT_KEY,
    groupSceneRecords,
    resolveCharacterColor,
    type SceneCardRecord,
} from './buildSceneChips';

export interface ArcsViewInput {
    model: SceneBoardModel,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
    /** Card records in the order they were added; a point needs a stored `arcValue`. */
    records?: readonly SceneCardRecord[],
    /** Pre-built filter characters list, in Matrix row order. */
    filterCharacters: readonly BoardFilterCharacter[],
    /** Filtered characters; empty filters nothing. */
    selectedIds: ReadonlySet<string>,
    sceneNumberFormat: SceneNumberFormat,
}

/*
 * Shapes the model for Arcs: acts with their scenes and one arc per confirmed, filtered
 * character in Matrix row order. A point exists wherever a record carries a value; script
 * evidence decides whether it is drawn filled. Characters without any point still appear
 * in the legend, so every confirmed character has an arc to hover and activate.
 */
export const buildArcsView = ({
    model,
    characters,
    displayColorByKey,
    records = [],
    filterCharacters,
    selectedIds,
    sceneNumberFormat,
}: ArcsViewInput): {
    acts: BoardArcsAct[],
    arcs: BoardArcsArc[],
} => {
    const recordById = new Map(characters.map(character => [character.id, character]));
    const recordsByScene = groupSceneRecords(records.filter(record => recordById.has(record.characterId)));
    const scenes = model.acts.flatMap(act => act.scenes);

    const arcs = filterCharacters
        .filter(character => selectedIds.size === 0 || selectedIds.has(character.id))
        .flatMap(character => {
            const record = recordById.get(character.id);

            if (!record) return [];

            const points = scenes.flatMap((scene, sceneIndex) => {
                const arcRecord = (recordsByScene.get(scene.headingBlockId) ?? [])
                    .find(item => item.characterId === character.id && (item.arcValue ?? null) !== null);

                if (!arcRecord) return [];

                return [
{
    headingBlockId: scene.headingBlockId,
    sceneIndex,
    value: arcRecord.arcValue ?? 0,
    onCard: arcRecord.onCard !== false,
    evidence: scene.characters.some(sceneCharacter => sceneCharacter.characterId === character.id),
    note: arcRecord.note ?? null,
} satisfies BoardArcsPoint,
                ];
            });

            return [
{
    id: character.id,
    name: character.name,
    color: resolveCharacterColor(record, displayColorByKey),
    points,
    presence: scenes.flatMap((scene, index) => scene.characters.some(item => item.characterId === character.id) ? [index] : []),
} satisfies BoardArcsArc,
            ];
        });

    return {
        acts: model.acts
            .filter(act => act.scenes.length > 0)
            .map(act => ({
                key: act.actBlockId ?? DEFAULT_ACT_KEY,
                name: act.name,
                scenes: act.scenes.map(scene => ({
                    headingBlockId: scene.headingBlockId,
                    number: formatSceneNumber(scene.number, sceneNumberFormat),
                    title: scene.title,
                })),
            })),
        arcs,
    };
};

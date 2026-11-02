import type {
    SceneBoardCharacter,
    SceneBoardModel,
    ScriptCharacterRecord,
} from '@stagistic/script';
import type {
    BoardFilterCharacter,
    BoardMatrixAct,
    BoardMatrixCell,
    BoardMatrixRow,
} from '@stagistic/ui';

import {
    buildCharacterChip,
    buildSceneChipIndex,
    DEFAULT_ACT_KEY,
    groupSceneRecords,
    type SceneCardRecord,
} from './buildSceneChips';

export interface MatrixViewInput {
    model: SceneBoardModel,
    characters: readonly ScriptCharacterRecord[],
    displayColorByKey: ReadonlyMap<string, string>,
    getStartPage: (headingBlockId: string) => number | null,
    /** Card records in the order they were added. */
    records?: readonly SceneCardRecord[],
    /** Pre-built filter characters list. */
    filterCharacters: readonly BoardFilterCharacter[],
    /** Filtered characters; empty filters nothing. Unconfirmed characters cannot be filtered. */
    selectedIds: ReadonlySet<string>,
}

/*
 * Shapes the model for the Matrix: characters as rows in filter order, scenes as columns
 * grouped by act. A cell is a note (■), script presence (●), card-only presence (○) or
 * empty. Filtering removes rows, never columns, so gaps in the story stay visible.
 */
export const buildMatrixView = ({
    model,
    characters,
    displayColorByKey,
    getStartPage,
    records = [],
    filterCharacters,
    selectedIds,
}: MatrixViewInput): {
    acts: BoardMatrixAct[],
    rows: BoardMatrixRow[],
} => {
    const recordById = new Map(characters.map(character => [character.id, character]));
    const recordsByScene = groupSceneRecords(records.filter(record => recordById.has(record.characterId)));
    const scenes = model.acts.flatMap(act => act.scenes);
    const chipIndexes = new Map(scenes.map(scene => [
        scene.headingBlockId,
        buildSceneChipIndex(scene, recordsByScene.get(scene.headingBlockId) ?? []),
    ]));
    const unconfirmedByScene = new Map(scenes.map(scene => [
        scene.headingBlockId,
        new Map(scene.characters.flatMap(character => (character.characterId ? [] : [[character.entryId, character]]))),
    ]));

    const confirmedRows = filterCharacters
        .filter(character => selectedIds.size === 0 || selectedIds.has(character.id))
        .flatMap(character => {
            const record = recordById.get(character.id);

            if (!record) return [];

            const cells = scenes.map(scene => {
                const {noteById, evidenceById} = chipIndexes.get(scene.headingBlockId) ?? {
                    noteById: new Map<string, string | null>(),
                    evidenceById: new Map<string, SceneBoardCharacter>(),
                };
                const evidence = evidenceById.get(character.id);
                const note = noteById.get(character.id) || null;

                if (!evidence && !noteById.has(character.id)) return {kind: 'empty', chip: null} satisfies BoardMatrixCell;

                return {
                    kind: note !== null ? 'note' : evidence ? 'script' : 'card',
                    chip: buildCharacterChip({
                        id: character.id,
                        characterId: character.id,
                        key: character.name,
                        record,
                        note,
                        source: evidence ? 'script' : 'card',
                    }, displayColorByKey),
                } satisfies BoardMatrixCell;
            });

            return {
                id: character.id,
                characterId: character.id,
                name: character.name,
                color: character.color,
                sceneCount: character.sceneCount,
                cells,
            } satisfies BoardMatrixRow;
        });

    /* Unconfirmed characters follow the confirmed ones, in order of first appearance. */
    const unconfirmedAppearances = new Map<string, {key: string, sceneCount: number}>();

    scenes.forEach(scene => unconfirmedByScene.get(scene.headingBlockId)?.forEach((character, entryId) => {
        const existing = unconfirmedAppearances.get(entryId);

        if (existing) {
            existing.sceneCount += 1;
        } else {
            unconfirmedAppearances.set(entryId, {key: character.key, sceneCount: 1});
        }
    }));

    const unconfirmedRows = selectedIds.size === 0 ? [...unconfirmedAppearances.entries()].map(([entryId, {key, sceneCount}]) => ({
        id: entryId,
        characterId: null,
        name: key,
        color: null,
        sceneCount,
        cells: scenes.map(scene => {
            const character = unconfirmedByScene.get(scene.headingBlockId)?.get(entryId);

            if (!character) return {kind: 'empty', chip: null} satisfies BoardMatrixCell;

            return {
                kind: 'script',
                chip: buildCharacterChip({
                    id: entryId,
                    characterId: null,
                    key: character.key,
                    note: null,
                    source: 'script',
                }, displayColorByKey),
            } satisfies BoardMatrixCell;
        }),
    } satisfies BoardMatrixRow)) : [];

    return {
        acts: model.acts
            .filter(act => act.scenes.length > 0)
            .map(act => ({
                key: act.actBlockId ?? DEFAULT_ACT_KEY,
                name: act.name,
                scenes: act.scenes.map(scene => ({
                    headingBlockId: scene.headingBlockId,
                    number: scene.number,
                    title: scene.title,
                    page: getStartPage(scene.headingBlockId),
                })),
            })),
        rows: [...confirmedRows, ...unconfirmedRows],
    };
};

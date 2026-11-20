import type {IndexedScriptCharacterRef} from '../indexing';
import {normalizeCharacterKey} from '../syntax';
import type {
    SceneBoardCatalog,
    SceneBoardCatalogCharacter,
    SceneBoardCatalogGroup,
} from './types';

export interface ResolvedBoardCharacter {
    entryId: string,
    characterId: string | null,
    key: string,
}

export type BoardCharacterResolver = (ref: IndexedScriptCharacterRef) => ResolvedBoardCharacter[];

const toResolved = (character: SceneBoardCatalogCharacter): ResolvedBoardCharacter => ({
    entryId: character.id,
    characterId: character.id,
    key: character.key,
});

/*
 * Turns an indexed character reference into board entries. A reference by id wins;
 * a reference without a (known) id falls back to its key, so a confirmed character
 * never shows twice. A group is not shown itself: it expands to its members. What
 * no record claims stays an unconfirmed entry keyed by name.
 */
export const createBoardCharacterResolver = (catalog: SceneBoardCatalog): BoardCharacterResolver => {
    const characterById = new Map(catalog.characters.map(character => [character.id, character]));
    const characterByKey = new Map(catalog.characters.map(character => [normalizeCharacterKey(character.key), character]));
    const groupById = new Map(catalog.groups.map(group => [group.id, group]));
    const groupByKey = new Map(catalog.groups.map(group => [normalizeCharacterKey(group.key), group]));

    const expandGroup = (group: SceneBoardCatalogGroup) => group.memberIds.flatMap(memberId => {
        const member = characterById.get(memberId);

        return member ? [toResolved(member)] : [];
    });

    return ref => {
        const key = normalizeCharacterKey(ref.key);
        const byId = ref.characterId ? characterById.get(ref.characterId) : undefined;
        const groupByRefId = ref.characterId ? groupById.get(ref.characterId) : undefined;
        const character = byId ?? (groupByRefId ? undefined : characterByKey.get(key));

        if (character) {
            return [toResolved(character)];
        }

        const group = groupByRefId ?? groupByKey.get(key);

        if (group) {
            return expandGroup(group);
        }

        return [
            {
                entryId: `key:${key}`,
                characterId: null,
                key,
            },
        ];
    };
};

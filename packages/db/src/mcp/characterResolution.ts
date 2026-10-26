import type {scriptCharacters} from '../schema';

type RefRow = {
    blockId: string,
    characterId: string | null,
    characterKey: string,
};

type CharacterRow = typeof scriptCharacters.$inferSelect;

export interface ResolvedCharacterRef {
    id: string | null,
    key: string,
}

export const resolveCharactersForBlock = (
    blockId: string,
    textContent: string,
    refs: RefRow[],
    characters: CharacterRow[],
): ResolvedCharacterRef[] => {
    const blockRefs = refs.filter(r => r.blockId === blockId);

    if (blockRefs.length > 0) {
        return blockRefs.map(r => ({
            id: r.characterId,
            key: r.characterKey,
        }));
    }

    const fallbackKey = textContent.replace(/^@/, '').trim().toUpperCase();
    const matchedChar = characters.find(c => c.characterKey.toUpperCase() === fallbackKey);

    return [
        {
            id: matchedChar?.id ?? null,
            key: fallbackKey,
        },
    ];
};

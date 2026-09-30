import type {ExtractedBlockRow} from '../../blocks';

/** Character-ref rows for a block, keeping only refs to characters that exist. */
export const toCharacterRefRows = (block: ExtractedBlockRow, knownCharacterIds: Set<string>) => {
    return Object.entries(block.characterRefByKey)
        .filter(([, characterId]) => knownCharacterIds.has(characterId))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([characterKey, characterId]) => ({
            characterId,
            characterKey,
            isConfirmed: true,
        }));
};

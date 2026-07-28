import type {PersistentCharacterRef} from '../../contracts';

export type {PersistentCharacterRef};

export type SuggestionEntry = {
    key: string,
    color: string,
};

export type SuppressedSelection = {
    blockId: string,
    position: number,
};

export type CharacterSuggestionsResult = {
    shouldKeepSuppressedSelection: false,
    style: {
        top: number,
        left: number,
    },
    suggestions: SuggestionEntry[],
} | {
    shouldKeepSuppressedSelection: true,
};

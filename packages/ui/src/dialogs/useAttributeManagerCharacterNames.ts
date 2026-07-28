import {
    useCallback,
    useMemo,
} from 'react';

import {useKeyedFieldDrafts} from '../hooks/useKeyedFieldDrafts';
import type {AttributeManagerCharacter} from './AttributeManagerCharactersPanel';

interface UseAttributeManagerCharacterNamesArgs {
    characters: AttributeManagerCharacter[],
    draftScopeKey: string | null,
    onRenameCharacter?: (
        characterId: string,
        previousName: string,
        nextName: string,
    ) => void | Promise<unknown>,
}

export const useAttributeManagerCharacterNames = ({
    characters,
    draftScopeKey,
    onRenameCharacter,
}: UseAttributeManagerCharacterNamesArgs) => {
    const {
        getValue,
        persistValue,
        resetValue,
        setValue,
    } = useKeyedFieldDrafts<string>(draftScopeKey);
    const displayedCharacters = useMemo(() => characters.map(character => ({
        ...character,
        name: getValue(character.id, character.name),
    })), [characters, getValue]);
    const persistName = useCallback((
        characterId: string,
        previousName: string,
        nextName: string,
    ) => persistValue(
        characterId,
        nextName,
        name => onRenameCharacter?.(characterId, previousName, name),
    ), [onRenameCharacter, persistValue]);

    return {
        displayedCharacters,
        persistName,
        resetName: resetValue,
        setName: setValue,
    };
};

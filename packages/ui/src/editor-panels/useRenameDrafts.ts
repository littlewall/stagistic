import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import type {EditorSidebarCharacter} from './types';
import {getRenameDraftKey} from './utils';

type RenameCharacterPreview = (
    characterId: string,
    previousCharacterName: string,
    nextCharacterName: string,
) => void;

type RenameCharacter = (
    characterId: string,
    previousCharacterName: string,
    nextCharacterName: string,
) => void | Promise<void>;

interface UseRenameDraftsArgs {
    confirmedCharacters: EditorSidebarCharacter[],
    normalizeRenameInput?: (value: string) => string,
    onRenameCharacterPreview?: RenameCharacterPreview,
    onRenameCharacter?: RenameCharacter,
}

export const useRenameDrafts = ({
    confirmedCharacters,
    normalizeRenameInput,
    onRenameCharacterPreview,
    onRenameCharacter,
}: UseRenameDraftsArgs) => {
    const [renameDraftByKey, setRenameDraftByKey] = useState<Record<string, string>>({});

    useEffect(() => {
        setRenameDraftByKey(previous => {
            const next: Record<string, string> = {};

            confirmedCharacters.forEach(character => {
                const draftKey = getRenameDraftKey(character.id, character.key);

                next[draftKey] = previous[draftKey] ?? character.key;
            });

            return next;
        });
    }, [confirmedCharacters]);

    const handleRenameDraftChange = useCallback((characterId: string, characterKey: string, value: string) => {
        const draftKey = getRenameDraftKey(characterId, characterKey);
        const previousValueRaw = renameDraftByKey[draftKey] ?? characterKey;
        const previousValue = previousValueRaw.trim().length === 0
            ? characterKey
            : previousValueRaw;
        const normalizedValue = normalizeRenameInput
            ? normalizeRenameInput(value)
            : value;

        if (characterId && normalizedValue !== previousValueRaw) {
            onRenameCharacterPreview?.(characterId, previousValue, normalizedValue);
        }

        setRenameDraftByKey(previous => ({
            ...previous,
            [draftKey]: normalizedValue,
        }));
    }, [
        normalizeRenameInput,
        onRenameCharacterPreview,
        renameDraftByKey,
    ]);

    const commitRenameDraft = useCallback((characterId: string, characterKey: string) => {
        const draftKey = getRenameDraftKey(characterId, characterKey);
        const draftValue = (renameDraftByKey[draftKey] ?? characterKey).trim();

        if (draftValue.length === 0) {
            setRenameDraftByKey(previous => ({
                ...previous,
                [draftKey]: characterKey,
            }));

            return;
        }

        if (draftValue === characterKey || !characterId) {
            return;
        }

        void onRenameCharacter?.(characterId, characterKey, draftValue);
    }, [onRenameCharacter, renameDraftByKey]);

    return {
        renameDraftByKey,
        handleRenameDraftChange,
        commitRenameDraft,
    };
};

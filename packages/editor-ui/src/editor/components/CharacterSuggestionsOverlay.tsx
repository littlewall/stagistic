import type {Editor as TiptapEditor} from '@tiptap/react';
import {type RefObject} from 'react';

import {CharacterSuggestionsOverlayView} from './characterSuggestions/CharacterSuggestionsOverlayView';
import {
    type PersistentCharacterRef,
} from './characterSuggestions/model';
import {useCharacterSuggestions} from './characterSuggestions/useCharacterSuggestions';

type CharacterSuggestionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentCharacters?: readonly PersistentCharacterRef[],
};

const CharacterSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentCharacters = [],
}: CharacterSuggestionsOverlayProps) => {
    const {
        overlayState,
        suggestionEntries,
        handleSuggestionMouseDown,
    } = useCharacterSuggestions({
        editor,
        canvasRef,
        persistentCharacters,
    });

    if (!overlayState || !editor) {
        return null;
    }

    return (
        <CharacterSuggestionsOverlayView
            style={overlayState.style}
            suggestions={suggestionEntries}
            onSuggestionMouseDown={handleSuggestionMouseDown}
        />
    );
};

export default CharacterSuggestionsOverlay;

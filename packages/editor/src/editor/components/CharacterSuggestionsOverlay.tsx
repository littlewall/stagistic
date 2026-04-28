import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type RefObject,
    useRef,
} from 'react';

import {CharacterSuggestionsOverlayView} from './characterSuggestions/CharacterSuggestionsOverlayView';
import {
    type PersistentCharacterRef,
} from './characterSuggestions/model';
import {useCharacterSuggestions} from './characterSuggestions/useCharacterSuggestions';

type CharacterSuggestionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
};

const CharacterSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentCharacters = [],
    characterColorSaturation,
}: CharacterSuggestionsOverlayProps) => {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const {
        overlayState,
        suggestionEntries,
        activeSuggestionIndex,
        handleSuggestionMouseDown,
    } = useCharacterSuggestions({
        editor,
        canvasRef,
        overlayRef,
        persistentCharacters,
        characterColorSaturation,
    });

    if (!editor || persistentCharacters.length === 0 || !overlayState || suggestionEntries.length === 0) {
        return null;
    }

    return (
        <CharacterSuggestionsOverlayView
            overlayRef={overlayRef}
            style={overlayState.style}
            suggestions={suggestionEntries}
            activeSuggestionIndex={activeSuggestionIndex}
            onSuggestionMouseDown={handleSuggestionMouseDown}
        />
    );
};

export default CharacterSuggestionsOverlay;

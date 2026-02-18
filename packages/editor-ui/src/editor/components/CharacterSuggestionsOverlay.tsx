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
        handleSuggestionMouseDown,
    } = useCharacterSuggestions({
        editor,
        canvasRef,
        overlayRef,
        persistentCharacters,
        characterColorSaturation,
    });

    if (!overlayState || !editor) {
        return null;
    }

    return (
        <CharacterSuggestionsOverlayView
            overlayRef={overlayRef}
            style={overlayState.style}
            suggestions={suggestionEntries}
            onSuggestionMouseDown={handleSuggestionMouseDown}
        />
    );
};

export default CharacterSuggestionsOverlay;

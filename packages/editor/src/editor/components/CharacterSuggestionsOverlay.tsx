import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type RefObject,
    useEffect,
    useId,
    useRef,
} from 'react';

import {getCharacterSuggestionOptionId} from './characterSuggestions/accessibility';
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
    const listboxId = useId();
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

    const isOpen = overlayState !== null && suggestionEntries.length > 0;
    const activeSuggestionId = activeSuggestionIndex !== null
        && suggestionEntries[activeSuggestionIndex]
        ? getCharacterSuggestionOptionId(listboxId, activeSuggestionIndex)
        : null;

    useEffect(() => {
        const editorElement = editor?.view.dom;

        if (!editorElement || !isOpen) {
            return;
        }

        editorElement.setAttribute('aria-controls', listboxId);

        if (activeSuggestionId) {
            editorElement.setAttribute('aria-activedescendant', activeSuggestionId);
        } else {
            editorElement.removeAttribute('aria-activedescendant');
        }

        return () => {
            editorElement.removeAttribute('aria-activedescendant');
            editorElement.removeAttribute('aria-controls');
        };
    }, [
        activeSuggestionId,
        editor,
        isOpen,
        listboxId,
    ]);

    if (!editor || persistentCharacters.length === 0 || !isOpen) {
        return null;
    }

    return (
        <CharacterSuggestionsOverlayView
            overlayRef={overlayRef}
            listboxId={listboxId}
            style={overlayState.style}
            suggestions={suggestionEntries}
            activeSuggestionIndex={activeSuggestionIndex}
            onSuggestionMouseDown={handleSuggestionMouseDown}
        />
    );
};

export default CharacterSuggestionsOverlay;

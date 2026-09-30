import {CHARACTER_TAG_MARK_NAME, normalizeCharacterKey} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {getCharacterColor} from '../../../characters/characterColors';
import {isCaretAtCharacterTagEnd, readCommittedTagCharacterId} from '../../../tiptap/extensions/characterTagInput/markRanges';
import {getCharacterTagComposeFromState} from '../../../tiptap/extensions/CharacterTagInputExtension';
import {getActiveScriptBlockFromState, SCRIPT_BLOCK_NODE_NAMES} from '../../../tiptap/scriptCore';
import type {
    CharacterSuggestionsResult,
    PersistentCharacterRef,
    SuppressedSelection,
} from '../types';
import {buildSuggestionRows} from './buildSuggestionRows';
import {
    CHARACTER_TAG_HORIZONTAL_PADDING_PX,
    MAX_SUGGESTIONS,
    OVERLAY_WIDTH_PX,
} from './constants';
import {computeOverlayStyle} from './overlayPosition';
import {getPersistentColorByKey} from './persistentCharacters';

export type OverlayComputationArgs = {
    editor: TiptapEditor,
    canvas: HTMLElement,
    normalizedPersistentCharacters: readonly PersistentCharacterRef[],
    liveCountsByKey: ReadonlyMap<string, number>,
    suppressedSelection: SuppressedSelection | null,
    previousOrderByKey?: ReadonlyMap<string, number>,
    characterColorSaturation?: number,
};

export const buildSuggestionEntries = (
    suggestionRows: ReturnType<typeof buildSuggestionRows>,
    persistentColorByKey: ReadonlyMap<string, string>,
    characterColorSaturation?: number,
) => {
    return suggestionRows.map(([key]) => ({
        key,
        color: persistentColorByKey.get(key) ?? getCharacterColor(key, characterColorSaturation),
    }));
};

/**
 * Confirmed-cast suggestions for an active `@` character-tag compose region in
 * a stage direction. The overlay positions over the forming pill and filters
 * the cast by the live query (spec §5: "offering confirmed cast only").
 */
export const computeCharacterTagComposeSuggestions = ({
    editor,
    canvas,
    normalizedPersistentCharacters,
    liveCountsByKey,
    previousOrderByKey,
    characterColorSaturation,
    compose,
}: OverlayComputationArgs & {
    compose: NonNullable<ReturnType<typeof getCharacterTagComposeFromState>>,
}): CharacterSuggestionsResult | null => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block || normalizedPersistentCharacters.length === 0) {
        return null;
    }

    const markType = editor.state.schema.marks[CHARACTER_TAG_MARK_NAME];

    /*
     * Only suggest when the caret is at the end of the pill — never while
     * editing in its middle (e.g. a backspace inside a committed name).
     */
    if (!markType || !isCaretAtCharacterTagEnd(editor.state, compose.to, markType)) {
        return null;
    }

    const activeKey = normalizeCharacterKey(compose.query);
    const countsByConfirmedKey = new Map<string, number>();

    normalizedPersistentCharacters.forEach(character => {
        if (countsByConfirmedKey.has(character.key)) {
            return;
        }

        countsByConfirmedKey.set(character.key, liveCountsByKey.get(character.key) ?? 0);
    });

    if (countsByConfirmedKey.size === 0) {
        return null;
    }

    /*
     * When the compose region is an already-confirmed pill, its own character
     * is redundant in the list — it is exactly what is in the pill. Hide it so
     * the overlay only offers alternatives (spec §5).
     */
    const committedCharacterId = readCommittedTagCharacterId(editor.state, compose.from, compose.to, markType);
    const excludedKeys = new Set<string>();

    if (committedCharacterId) {
        const confirmedCharacter = normalizedPersistentCharacters.find(character => character.id === committedCharacterId);

        if (confirmedCharacter) {
            excludedKeys.add(confirmedCharacter.key);
        }
    }

    const suggestionRows = buildSuggestionRows({
        counts: countsByConfirmedKey,
        activeKey,
        includeActiveKey: true,
        excludedKeys,
        limit: Math.max(countsByConfirmedKey.size, MAX_SUGGESTIONS),
        previousOrderByKey,
    });

    if (suggestionRows.length === 0) {
        return null;
    }

    const style = computeOverlayStyle({
        editor,
        canvas,
        blockFrom: block.from,
        blockTo: block.to,
        valueStart: compose.from - block.from,
        valueEnd: compose.to - block.from,
        overlayWidthPx: OVERLAY_WIDTH_PX,
        horizontalPaddingPx: CHARACTER_TAG_HORIZONTAL_PADDING_PX,
    });

    if (!style) {
        return null;
    }

    const persistentColorByKey = getPersistentColorByKey(normalizedPersistentCharacters, characterColorSaturation);

    return {
        shouldKeepSuppressedSelection: false,
        style,
        suggestions: buildSuggestionEntries(suggestionRows, persistentColorByKey, characterColorSaturation),
    };
};

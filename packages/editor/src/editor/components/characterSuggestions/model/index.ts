import {normalizeCharacterKey} from '@stagistic/script';

import {getCharacterTagComposeFromState} from '../../../tiptap/extensions/CharacterTagInputExtension';
import {getActiveScriptBlockFromState, SCRIPT_BLOCK_NODE_NAMES} from '../../../tiptap/scriptCore';
import type {CharacterSuggestionsResult} from '../types';
import {resolveActiveToken} from './activeToken';
import {isCharacterBlockType} from './blockUtils';
import {buildSuggestionRows} from './buildSuggestionRows';
import {
    buildSuggestionEntries,
    computeCharacterTagComposeSuggestions,
    type OverlayComputationArgs,
} from './composeSuggestions';
import {
    CHARACTER_TAG_HORIZONTAL_PADDING_PX,
    MAX_SUGGESTIONS,
    OVERLAY_WIDTH_PX,
} from './constants';
import {computeOverlayStyle} from './overlayPosition';
import {getPersistentColorByKey} from './persistentCharacters';

export type {
    CharacterSuggestionsResult,
    PersistentCharacterRef,
    SuggestionEntry,
    SuppressedSelection,
} from '../types';
export {applyCharacterSuggestion} from './applyCharacterSuggestion';
export {normalizePersistentCharacters} from './persistentCharacters';

export const computeCharacterSuggestions = ({
    editor,
    canvas,
    normalizedPersistentCharacters,
    liveCountsByKey,
    suppressedSelection,
    previousOrderByKey,
    characterColorSaturation,
}: OverlayComputationArgs): CharacterSuggestionsResult | null => {
    const compose = getCharacterTagComposeFromState(editor.state);

    if (compose) {
        return computeCharacterTagComposeSuggestions({
            editor,
            canvas,
            normalizedPersistentCharacters,
            liveCountsByKey,
            suppressedSelection,
            previousOrderByKey,
            characterColorSaturation,
            compose,
        });
    }

    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block || !isCharacterBlockType(block.blockType) || !editor.state.selection.empty) {
        return null;
    }

    if (suppressedSelection && suppressedSelection.blockId === block.id && suppressedSelection.position === editor.state.selection.from) {
        return {
            shouldKeepSuppressedSelection: true,
        };
    }

    const tokenResult = resolveActiveToken(editor, block);

    if (!tokenResult) {
        return null;
    }

    if (normalizedPersistentCharacters.length === 0) {
        return null;
    }

    const {
        tokens,
        activeTokenIndex,
        activeToken,
    } = tokenResult;
    const activeKey = normalizeCharacterKey(activeToken.value);
    /*
     * Collect keys of all other tokens in the same character group
     * (tokens joined by `+` inside one character block). Picking one of
     * those from the suggestion dropdown would be a no-op — the apply
     * step dedupes by key — so hide them from the user.
     */
    const groupSiblingKeys = new Set<string>();

    tokens.forEach((token, index) => {
        if (index === activeTokenIndex) {
            return;
        }

        const siblingKey = normalizeCharacterKey(token.value);

        if (siblingKey.length > 0) {
            groupSiblingKeys.add(siblingKey);
        }
    });

    const countsByConfirmedKey = new Map<string, number>();

    normalizedPersistentCharacters.forEach(character => {
        const key = character.key;

        if (countsByConfirmedKey.has(key)) {
            return;
        }

        countsByConfirmedKey.set(key, liveCountsByKey.get(key) ?? 0);
    });

    if (countsByConfirmedKey.size === 0) {
        return null;
    }

    const persistentColorByKey = getPersistentColorByKey(normalizedPersistentCharacters, characterColorSaturation);

    const suggestionRows = buildSuggestionRows({
        counts: countsByConfirmedKey,
        activeKey,
        excludedKeys: groupSiblingKeys,
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
        valueStart: activeToken.valueStart,
        valueEnd: activeToken.valueEnd,
        overlayWidthPx: OVERLAY_WIDTH_PX,
        horizontalPaddingPx: CHARACTER_TAG_HORIZONTAL_PADDING_PX,
    });

    if (!style) {
        return null;
    }

    return {
        shouldKeepSuppressedSelection: false,
        style,
        suggestions: buildSuggestionEntries(suggestionRows, persistentColorByKey, characterColorSaturation),
    };
};

import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/script-core';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    getCharacterColor,
    normalizeCharacterColorHex,
} from '../../characterColors';
import {
    getConfirmedCharacterColor,
    normalizePersistentCharacterRefs,
} from '../../characters/colorResolver';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../../tiptap/fountainCore';
import {isCharacterBlockType} from './model/blockUtils';
import {buildSuggestionRows} from './model/buildSuggestionRows';
import {
    CHARACTER_TAG_HORIZONTAL_PADDING_PX,
    MAX_SUGGESTIONS,
    OVERLAY_WIDTH_PX,
} from './model/constants';
import {computeOverlayStyle} from './model/overlayPosition';
import {getActiveTokenIndex, splitBaseAndSuffix} from './model/tokenUtils';
import type {
    CharacterSuggestionsResult,
    PersistentCharacterRef,
    SuppressedSelection,
} from './types';

export type {
    CharacterSuggestionsResult,
    PersistentCharacterRef,
    SuggestionEntry,
    SuppressedSelection,
} from './types';

const getPersistentColorByKey = (
    normalizedPersistentCharacters: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
) => {
    return new Map(
        normalizedPersistentCharacters.map(character => {
            return [
                character.key, getConfirmedCharacterColor(
                    character.id,
                    character.colorHex ?? null,
                    characterColorSaturation,
                ),
            ] as const;
        }),
    );
};

export const normalizePersistentCharacters = (persistentCharacters: readonly PersistentCharacterRef[]) => {
    return normalizePersistentCharacterRefs(persistentCharacters).map(character => ({
        id: character.id,
        key: character.key,
        colorHex: normalizeCharacterColorHex(character.colorHex) ?? null,
    }));
};

export const applyCharacterSuggestion = (editor: TiptapEditor, suggestion: string): SuppressedSelection | null => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (
        !block
        || !isCharacterBlockType(block.blockType)
        || !editor.state.selection.empty
    ) {
        return null;
    }

    const text = block.node.textContent ?? '';
    const tokens = splitCharacterTokens(text);
    const offset = Math.max(0, editor.state.selection.from - block.from);
    const activeTokenIndex = getActiveTokenIndex(text, offset);
    const activeToken = tokens[activeTokenIndex];

    if (!activeToken) {
        return null;
    }

    const {suffix} = splitBaseAndSuffix(activeToken.value);
    const replacement = suffix.length > 0
        ? `${suggestion} ${suffix}`
        : suggestion;
    const selectedKey = normalizeCharacterKey(replacement);
    const mergedValues = tokens.map((token, index) => {
        if (index === activeTokenIndex) {
            return replacement;
        }

        return token.value.trim();
    });
    const dedupedValues: string[] = [];
    const seen = new Set<string>();

    mergedValues.forEach((value, index) => {
        const normalized = value.trim();
        const key = normalizeCharacterKey(normalized);

        if (normalized.length === 0 || key.length === 0) {
            return;
        }

        if (index !== activeTokenIndex && key === selectedKey) {
            return;
        }

        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        dedupedValues.push(normalized);
    });

    const nextLine = dedupedValues.join('+');
    let tr = editor.state.tr.insertText(nextLine, block.from, block.to);
    const nextSelection = block.from + nextLine.length;

    tr = tr.setSelection(TextSelection.create(tr.doc, nextSelection));
    editor.view.dispatch(tr.scrollIntoView());
    editor.commands.focus(nextSelection);

    const nextBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!nextBlock) {
        return null;
    }

    return {
        blockId: nextBlock.id,
        position: editor.state.selection.from,
    };
};

type OverlayComputationArgs = {
    editor: TiptapEditor,
    canvas: HTMLElement,
    normalizedPersistentCharacters: readonly PersistentCharacterRef[],
    liveCountsByKey: ReadonlyMap<string, number>,
    suppressedSelection: SuppressedSelection | null,
    previousOrderByKey?: ReadonlyMap<string, number>,
    characterColorSaturation?: number,
};

export const computeCharacterSuggestions = ({
    editor,
    canvas,
    normalizedPersistentCharacters,
    liveCountsByKey,
    suppressedSelection,
    previousOrderByKey,
    characterColorSaturation,
}: OverlayComputationArgs): CharacterSuggestionsResult | null => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (
        !block
        || !isCharacterBlockType(block.blockType)
        || !editor.state.selection.empty
    ) {
        return null;
    }

    if (
        suppressedSelection
        && suppressedSelection.blockId === block.id
        && suppressedSelection.position === editor.state.selection.from
    ) {
        return {
            shouldKeepSuppressedSelection: true,
        };
    }

    const text = block.node.textContent ?? '';
    const tokens = splitCharacterTokens(text);
    const offset = Math.max(0, editor.state.selection.from - block.from);
    const activeTokenIndex = getActiveTokenIndex(text, offset);
    const activeToken = tokens[activeTokenIndex];

    if (!activeToken) {
        return null;
    }

    if (normalizedPersistentCharacters.length === 0) {
        return null;
    }

    const activeKey = normalizeCharacterKey(activeToken.value);
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

    const persistentColorByKey = getPersistentColorByKey(
        normalizedPersistentCharacters,
        characterColorSaturation,
    );

    const suggestionRows = buildSuggestionRows({
        counts: countsByConfirmedKey,
        activeKey,
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

    const suggestions = suggestionRows.map(([key]) => ({
        key,
        color: persistentColorByKey.get(key) ?? getCharacterColor(key, characterColorSaturation),
    }));

    return {
        shouldKeepSuppressedSelection: false,
        style,
        suggestions,
    };
};

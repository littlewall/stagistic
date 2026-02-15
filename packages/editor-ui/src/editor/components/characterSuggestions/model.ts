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
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../../tiptap/fountainCore';
import {collectCharacterCounts, isCharacterBlockType} from './model/blockUtils';
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

export const normalizePersistentCharacters = (persistentCharacters: readonly PersistentCharacterRef[]) => {
    const seenIds = new Set<string>();
    const seen = new Set<string>();
    const result: PersistentCharacterRef[] = [];

    persistentCharacters.forEach(character => {
        const key = normalizeCharacterKey(character.key);

        if (!character.id || seenIds.has(character.id)) {
            return;
        }

        if (key.length === 0 || seen.has(key)) {
            return;
        }

        seenIds.add(character.id);
        seen.add(key);
        result.push({
            id: character.id,
            key,
            colorHex: normalizeCharacterColorHex(character.colorHex) ?? null,
        });
    });

    return result;
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
    suppressedSelection: SuppressedSelection | null,
    characterColorSaturation?: number,
};

export const computeCharacterSuggestions = ({
    editor,
    canvas,
    normalizedPersistentCharacters,
    suppressedSelection,
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

    const {base} = splitBaseAndSuffix(activeToken.value);
    const query = normalizeCharacterKey(base);
    const activeKey = normalizeCharacterKey(activeToken.value);
    const occupiedKeys = new Set<string>();
    const counts = collectCharacterCounts(editor, normalizedPersistentCharacters);
    const persistentColorByKey = new Map(
        normalizedPersistentCharacters
            .filter(character => Boolean(character.colorHex))
            .map(character => [character.key, character.colorHex as string]),
    );
    const hasKnownActiveCharacter = activeKey.length > 0 && counts.has(activeKey);
    const shouldFilterByPrefix = !(hasKnownActiveCharacter && query === activeKey);

    tokens.forEach((token, index) => {
        if (index === activeTokenIndex) {
            return;
        }

        const key = normalizeCharacterKey(token.value);

        if (key.length > 0) {
            occupiedKeys.add(key);
        }
    });

    const suggestionRows = buildSuggestionRows({
        counts,
        activeKey,
        occupiedKeys,
        query,
        shouldFilterByPrefix,
        limit: MAX_SUGGESTIONS,
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

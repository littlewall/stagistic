import {normalizeCharacterKey} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {getActiveScriptBlockFromState, SCRIPT_BLOCK_NODE_NAMES} from '../../../tiptap/scriptCore';
import type {SuppressedSelection} from '../types';
import {resolveActiveToken} from './activeToken';
import {isCharacterBlockType} from './blockUtils';
import {splitBaseAndSuffix} from './tokenUtils';

export const applyCharacterSuggestion = (editor: TiptapEditor, suggestion: string): SuppressedSelection | null => {
    const block = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!block || !isCharacterBlockType(block.blockType) || !editor.state.selection.empty) {
        return null;
    }

    const tokenResult = resolveActiveToken(editor, block);

    if (!tokenResult) {
        return null;
    }

    const {
        tokens,
        activeTokenIndex,
        activeToken,
    } = tokenResult;

    const {suffix} = splitBaseAndSuffix(activeToken.value);
    const replacement = suffix.length > 0 ? `${suggestion} ${suffix}` : suggestion;
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

    // '/' is the canonical multi-character delimiter; '+' is legacy input only.
    const nextLine = dedupedValues.join('/');
    let tr = editor.state.tr.insertText(nextLine, block.from, block.to);
    const nextSelection = block.from + nextLine.length;

    tr = tr.setSelection(TextSelection.create(tr.doc, nextSelection));
    editor.view.dispatch(tr.scrollIntoView());
    editor.commands.focus(nextSelection);

    const nextBlock = getActiveScriptBlockFromState(editor.state, SCRIPT_BLOCK_NODE_NAMES);

    if (!nextBlock) {
        return null;
    }

    return {
        blockId: nextBlock.id,
        position: editor.state.selection.from,
    };
};

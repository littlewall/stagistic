import {normalizeCharacterEditorDelimiters} from '@stagistic/script';
import {type Transaction} from '@tiptap/pm/state';

import {type BlockNodeType} from '../../scriptCore';

const countLeadingTabs = (text: string) => {
    let count = 0;

    while (text.startsWith('\t', count)) {
        count += 1;
    }

    return count;
};

export const stripLeadingActionTabs = (
    tr: Transaction,
    previousBlockType: BlockNodeType,
    nextBlockType: BlockNodeType,
    blockContentStart: number,
    blockText: string,
): Transaction => {
    if (previousBlockType !== 'stageDirection' || nextBlockType === 'stageDirection') {
        return tr;
    }

    const indentCount = countLeadingTabs(blockText);

    if (indentCount === 0) {
        return tr;
    }

    return tr.delete(blockContentStart, blockContentStart + indentCount);
};

const BLOCK_DELIMITERS: Partial<Record<BlockNodeType, readonly [string, string]>> = {
    aside: ['(', ')'],
    note: ['[[', ']]'],
};

/**
 * Aside and note blocks render their syntax delimiters via CSS. A block
 * converted from a type that allows literal delimiters would otherwise show
 * them twice, so remove one complete outer pair from the editable content.
 */
export const stripRenderedBlockDelimiters = (tr: Transaction, nextBlockType: BlockNodeType, blockPos: number): Transaction => {
    const delimiters = BLOCK_DELIMITERS[nextBlockType];

    if (!delimiters) {
        return tr;
    }

    const [opening, closing] = delimiters;

    const mappedPos = tr.mapping.map(blockPos);
    const node = tr.doc.nodeAt(mappedPos);

    if (!node) {
        return tr;
    }

    const text = node.textContent;

    if (text.length < opening.length + closing.length || !text.startsWith(opening) || !text.endsWith(closing)) {
        return tr;
    }

    const contentStart = mappedPos + 1;
    const contentEnd = contentStart + node.content.size;
    let next = tr.delete(contentEnd - closing.length, contentEnd);

    next = next.delete(contentStart, contentStart + opening.length);

    return next;
};

export const normalizeCharacterMusicText = (tr: Transaction, nextBlockType: BlockNodeType, blockPos: number): Transaction => {
    if (nextBlockType !== 'character') {
        return tr;
    }

    const mappedPos = tr.mapping.map(blockPos);
    const node = tr.doc.nodeAt(mappedPos);

    if (!node) {
        return tr;
    }

    const contentStart = mappedPos + 1;
    const contentEnd = contentStart + node.content.size;
    const text = node.textContent;
    const normalized = normalizeCharacterEditorDelimiters(text);

    if (normalized === text) {
        return tr;
    }

    return tr.insertText(normalized, contentStart, contentEnd);
};

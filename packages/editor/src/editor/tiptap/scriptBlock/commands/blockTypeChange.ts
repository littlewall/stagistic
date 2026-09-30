import {resolveScriptBlockNodeType} from '@stagistic/script';
import type {NodeType} from '@tiptap/pm/model';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {IMMEDIATE_SAVE_META_KEY} from '../../../saveMeta';
import {
    type ActiveScriptBlock, type BlockNodeType, getActiveScriptBlockFromState, isScriptBlockNodeName, normalizeBlockNodeType,
} from '../../scriptCore';
import {normalizeFormerStageDirectionContent} from '../normalizeStageDirectionContent';
import {
    normalizeCharacterMusicText, stripLeadingActionTabs, stripRenderedBlockDelimiters,
} from './blockTextNormalization';
import {focusEditor, restoreBlockSelection} from './selection';

export const resolveNodeTypeForBlockType = (nodes: Record<string, NodeType>, blockType: BlockNodeType) => {
    const resolvedNodeTypeName = resolveScriptBlockNodeType(blockType);

    if (!resolvedNodeTypeName) {
        return null;
    }

    return nodes[resolvedNodeTypeName] ?? null;
};

export const insertParenPair = (editor: Editor, from: number, to: number) => {
    let tr = editor.state.tr.insertText('()', from, to);
    const nextSelection = from + 1;

    tr = tr.setSelection(TextSelection.create(tr.doc, nextSelection));
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);
};

export const applyBlockType = (editor: Editor, activeBlock: ActiveScriptBlock, normalized: BlockNodeType, id?: string) => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, normalized);

    if (!nodeType) {
        return false;
    }

    const attributes = {
        ...activeBlock.node.attrs,
        blockType: normalized,
        id: id ?? activeBlock.id,
        characterRefs:
            activeBlock.blockType === 'stageDirection' && normalized !== 'stageDirection'
                ? null
                : (activeBlock.node.attrs.characterRefs as Record<string, string> | null),
    };
    const {anchor: originalAnchor, head: originalHead} = editor.state.selection;

    let tr = editor.state.tr.setNodeMarkup(activeBlock.pos, nodeType, attributes);

    tr = stripLeadingActionTabs(tr, activeBlock.blockType, normalized, activeBlock.from, activeBlock.node.textContent ?? '');
    tr = normalizeFormerStageDirectionContent(tr, editor.schema, activeBlock.blockType, normalized, activeBlock.pos, activeBlock.node);
    tr = normalizeCharacterMusicText(tr, normalized, activeBlock.pos);
    tr = stripRenderedBlockDelimiters(tr, normalized, activeBlock.pos);
    tr = restoreBlockSelection(tr, activeBlock.pos, originalAnchor, originalHead);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

export const updateBlockType = (editor: Editor, blockType: BlockNodeType, id?: string) => {
    const normalized = normalizeBlockNodeType(blockType);
    const activeBlock = getActiveScriptBlockFromState(editor.state);

    if (!activeBlock) {
        return false;
    }

    if (activeBlock.blockType === 'scene' && normalized !== 'scene') {
        editor.commands.requestConvertScene(activeBlock.id, normalized);

        return true;
    }

    return applyBlockType(editor, activeBlock, normalized, id);
};

/**
 * Bulk block-type change for a multi-block selection (the toolbar's
 * "Selected blocks" dropdown). Each block type is its own ProseMirror node
 * type, so the node type itself must be swapped via setNodeMarkup's `type`
 * argument for every matching block — not just the `blockType` attribute —
 * otherwise the node keeps behaving as its old type (persistence, indexing,
 * casing) while only rendering as the new one.
 */
export const updateBlockTypeForSelection = (editor: Editor, blockType: BlockNodeType): boolean => {
    const normalized = normalizeBlockNodeType(blockType);
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, normalized);

    if (!nodeType) {
        return false;
    }

    const {state} = editor;
    const {from, to} = state.selection;
    let tr = state.tr;
    let didChange = false;

    state.doc.nodesBetween(from, to, (node, pos) => {
        if (!isScriptBlockNodeName(node.type.name)) {
            return true;
        }

        const previousBlockType = normalizeBlockNodeType(resolveScriptBlockNodeType(node.type.name) ?? (node.attrs.blockType as BlockNodeType));

        /*
         * Acts are structural and scenes carry projection-owned metadata whose
         * removal is confirmation-gated (see updateBlockType/requestConvertScene),
         * so a bulk selection convert leaves both untouched rather than silently
         * dropping a scene's synopsis/places. Same-type blocks are already done.
         */
        if (previousBlockType === 'act' || previousBlockType === 'scene' || previousBlockType === normalized) {
            return false;
        }

        const attributes = {
            ...node.attrs,
            blockType: normalized,
            characterRefs:
                previousBlockType === 'stageDirection' && normalized !== 'stageDirection' ? null : (node.attrs.characterRefs as Record<string, string> | null),
        };

        const mappedPos = tr.mapping.map(pos);

        tr = tr.setNodeMarkup(mappedPos, nodeType, attributes);
        tr = stripLeadingActionTabs(tr, previousBlockType, normalized, mappedPos + 1, node.textContent ?? '');
        tr = normalizeFormerStageDirectionContent(tr, editor.schema, previousBlockType, normalized, pos, node);
        tr = normalizeCharacterMusicText(tr, normalized, pos);
        tr = stripRenderedBlockDelimiters(tr, normalized, pos);
        didChange = true;

        return false;
    });

    if (!didChange) {
        return false;
    }

    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

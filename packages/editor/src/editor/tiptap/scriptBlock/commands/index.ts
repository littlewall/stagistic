import {createNodeId} from '@stagistic/script';
import type {NodeType} from '@tiptap/pm/model';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';

import {IMMEDIATE_SAVE_META_KEY} from '../../../saveMeta';
import {
    type ActiveScriptBlock, type BlockNodeType, normalizeBlockNodeType,
} from '../../scriptCore';
import {normalizeFormerStageDirectionContent} from '../normalizeStageDirectionContent';
import {stripLeadingActionTabs, stripRenderedBlockDelimiters} from './blockTextNormalization';
import {resolveNodeTypeForBlockType} from './blockTypeChange';
import {focusEditor, restoreBlockSelection} from './selection';

export {splitBlockWithType} from './blockSplit';
export {
    insertParenPair, updateBlockType, updateBlockTypeForSelection,
} from './blockTypeChange';

export const insertActionBefore = (editor: Editor, blockPos: number, blockStart: number) => {
    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const actionNodeType = resolveNodeTypeForBlockType(nodes, 'stageDirection');

    if (!actionNodeType) {
        return false;
    }

    const actionBlock = actionNodeType.create({
        blockType: 'stageDirection',
        id: createNodeId(),
    });

    let tr = editor.state.tr.insert(blockPos, actionBlock);
    const mappedStart = tr.mapping.map(blockStart);

    tr = tr.setSelection(TextSelection.create(tr.doc, mappedStart));
    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

export const setBlockTypeWithSelection = (editor: Editor, block: ActiveScriptBlock, blockType: BlockNodeType) => {
    const normalized = normalizeBlockNodeType(blockType);

    if (block.blockType === 'scene' && normalized !== 'scene') {
        editor.commands.requestConvertScene(block.id, normalized);

        return true;
    }

    const nodes = editor.schema.nodes as Record<string, NodeType>;
    const nodeType = resolveNodeTypeForBlockType(nodes, normalized);

    if (!nodeType) {
        return false;
    }

    const attrs = {
        ...block.node.attrs,
        blockType: normalized,
        id: block.id,
        characterRefs:
            block.blockType === 'stageDirection' && normalized !== 'stageDirection' ? null : (block.node.attrs.characterRefs as Record<string, string> | null),
    };

    const {anchor: originalAnchor, head: originalHead} = editor.state.selection;

    let tr = editor.state.tr.setNodeMarkup(block.pos, nodeType, attrs);

    tr = stripLeadingActionTabs(tr, block.blockType, normalized, block.from, block.node.textContent ?? '');
    tr = normalizeFormerStageDirectionContent(tr, editor.schema, block.blockType, normalized, block.pos, block.node);
    tr = stripRenderedBlockDelimiters(tr, normalized, block.pos);
    tr = restoreBlockSelection(tr, block.pos, originalAnchor, originalHead);
    tr.setMeta(IMMEDIATE_SAVE_META_KEY, true);

    editor.view.dispatch(tr.scrollIntoView());
    focusEditor(editor);

    return true;
};

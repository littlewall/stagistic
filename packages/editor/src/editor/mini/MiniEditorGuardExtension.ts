import {
    type Editor,
    Extension,
} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';

import {handleTab} from '../tiptap/scriptBlock/handlers';
import {
    findScriptBlockSelectionPosFromState,
    getActiveScriptBlockFromState,
    isSelectionAcrossBlocks,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../tiptap/scriptCore';
import {
    type MiniEditorStructureSignature,
    shouldApplyMiniEditorTransaction,
} from './miniEditorStructure';

export {
    buildMiniEditorDocumentStructureSignature,
    buildMiniEditorStructureSignature,
    matchesMiniEditorStructureSignature,
    type MiniEditorStructureSignature,
    shouldApplyMiniEditorTransaction,
} from './miniEditorStructure';

const moveToNextBlock = (
    editor: Editor,
    signature: MiniEditorStructureSignature,
) => {
    const block = getActiveScriptBlockFromState(
        editor.state,
        SCRIPT_BLOCK_NODE_NAMES,
    );

    if (!block) {
        return false;
    }

    const activeIndex = signature.blocks.findIndex(candidate => {
        return candidate.id === block.id;
    });
    const nextBlock = signature.blocks[activeIndex + 1];

    if (!nextBlock) {
        return true;
    }

    const selectionPos = findScriptBlockSelectionPosFromState(
        editor.state,
        nextBlock.id,
        SCRIPT_BLOCK_NODE_NAMES,
    );

    if (selectionPos === null) {
        return true;
    }

    return editor.commands.setTextSelection(selectionPos);
};

export const handleMiniEditorKeyDown = (
    editor: Editor,
    event: KeyboardEvent,
    signature?: MiniEditorStructureSignature,
) => {
    const block = getActiveScriptBlockFromState(
        editor.state,
        SCRIPT_BLOCK_NODE_NAMES,
    );

    if (!block) {
        return false;
    }

    if (
        (event.key === 'Backspace' || event.key === 'Delete')
        && isSelectionAcrossBlocks(editor.state, SCRIPT_BLOCK_NODE_NAMES)
    ) {
        event.preventDefault();

        return true;
    }

    if (
        event.key === 'Backspace'
        && editor.state.selection.empty
        && editor.state.selection.from === block.from
    ) {
        event.preventDefault();

        return true;
    }

    if (
        event.key === 'Delete'
        && editor.state.selection.empty
        && editor.state.selection.from === block.to
    ) {
        event.preventDefault();

        return true;
    }

    if (event.key === 'Tab') {
        if (block.blockType !== 'stageDirection') {
            return false;
        }

        return handleTab(editor, event);
    }

    if (event.key !== 'Enter') {
        return false;
    }

    event.preventDefault();

    if (event.shiftKey) {
        return editor.commands.setHardBreak();
    }

    return signature ? moveToNextBlock(editor, signature) : true;
};

export const MiniEditorGuardExtension = Extension.create<{
    signature?: MiniEditorStructureSignature,
}>({
    name: 'MiniEditorGuard',
    priority: 1100,

    addOptions() {
        return {signature: undefined};
    },

    addProseMirrorPlugins() {
        const {signature} = this.options;

        return [
            new Plugin({
                filterTransaction: transaction => {
                    if (!signature) {
                        return true;
                    }

                    return shouldApplyMiniEditorTransaction(
                        transaction,
                        signature,
                    );
                },
                props: {
                    handleKeyDown: (_view, event) => {
                        return handleMiniEditorKeyDown(
                            this.editor,
                            event,
                            signature,
                        );
                    },
                },
            }),
        ];
    },
});

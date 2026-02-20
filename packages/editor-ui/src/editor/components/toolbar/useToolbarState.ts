import {ELEMENT_ACT} from '@stagistic/script-core';
import {redoDepth, undoDepth} from '@tiptap/pm/history';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../../blocks/fountainBlockRegistry';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
} from '../../tiptap/fountainCore';

interface UseToolbarStateArgs {
    editor: TiptapEditor | null,
}

export const useToolbarState = ({editor}: UseToolbarStateArgs) => {
    const [hasEditorFocus, setHasEditorFocus] = useState(() => Boolean(editor?.isFocused));

    const toolbarState = useEditorState({
        editor,
        selector: ({editor: stateEditor}) => {
            if (!stateEditor) {
                return {
                    activeType: null,
                    canRedo: false,
                    canUndo: false,
                    isBold: false,
                    isItalic: false,
                    isUnderline: false,
                };
            }

            const activeBlock = getActiveFountainBlockFromState(
                stateEditor.state,
                FOUNTAIN_BLOCK_NODE_NAME,
            );
            const hasSingleBlockSelection = !isSelectionAcrossBlocks(
                stateEditor.state,
                FOUNTAIN_BLOCK_NODE_NAME,
            );

            return {
                activeType: hasSingleBlockSelection ? activeBlock?.blockType ?? null : null,
                canRedo: redoDepth(stateEditor.state) > 0,
                canUndo: undoDepth(stateEditor.state) > 0,
                isBold: stateEditor.isActive('bold'),
                isItalic: stateEditor.isActive('italic'),
                isUnderline: stateEditor.isActive('underline'),
            };
        },
        equalityFn: (a, b) => Boolean(
            a
            && b
            && a.activeType === b.activeType
            && a.canRedo === b.canRedo
            && a.canUndo === b.canUndo
            && a.isBold === b.isBold
            && a.isItalic === b.isItalic
            && a.isUnderline === b.isUnderline,
        ),
    });

    const activeType = toolbarState?.activeType ?? null;
    const canUndo = toolbarState?.canUndo ?? false;
    const canRedo = toolbarState?.canRedo ?? false;
    const isBoldActive = toolbarState?.isBold ?? false;
    const isItalicActive = toolbarState?.isItalic ?? false;
    const isUnderlineActive = toolbarState?.isUnderline ?? false;

    const activeBlockInfo = useMemo(() => {
        if (!activeType) {
            return null;
        }

        const option = FOUNTAIN_BLOCKS.find(block => block.type === activeType);

        return {
            type: activeType,
            icon: BLOCK_ICONS[activeType],
            label: option?.label ?? 'Block',
        };
    }, [activeType]);

    const canChangeBlockType = Boolean(activeBlockInfo) && hasEditorFocus && activeType !== ELEMENT_ACT;
    const visibleBlockInfo = canChangeBlockType ? activeBlockInfo : null;

    useEffect(() => {
        setHasEditorFocus(Boolean(editor?.isFocused));

        if (!editor) {
            return;
        }

        const handleFocus = () => setHasEditorFocus(true);
        const handleBlur = () => setHasEditorFocus(false);

        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
        };
    }, [editor]);

    return {
        activeType,
        activeBlockInfo,
        canUndo,
        canRedo,
        isBoldActive,
        isItalicActive,
        isUnderlineActive,
        canChangeBlockType,
        visibleBlockInfo,
    };
};

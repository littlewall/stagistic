import {redoDepth, undoDepth} from '@tiptap/pm/history';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {BLOCKS} from '../../blocks/blockRegistry';
import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {
    getActiveScriptBlockFromState,
    isSelectionAcrossBlocks,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../tiptap/scriptCore';

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

            const activeBlock = getActiveScriptBlockFromState(
                stateEditor.state,
                SCRIPT_BLOCK_NODE_NAMES,
            );
            const isMultiBlockSelection = isSelectionAcrossBlocks(
                stateEditor.state,
                SCRIPT_BLOCK_NODE_NAMES,
            );

            return {
                activeType: isMultiBlockSelection ? null : activeBlock?.blockType ?? null,
                canRedo: redoDepth(stateEditor.state) > 0,
                canUndo: undoDepth(stateEditor.state) > 0,
                isBold: stateEditor.isActive('bold'),
                isItalic: stateEditor.isActive('italic'),
                isUnderline: stateEditor.isActive('underline'),
                isMultiBlockSelection,
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
            && a.isUnderline === b.isUnderline
            && a.isMultiBlockSelection === b.isMultiBlockSelection,
        ),
    });

    const activeType = toolbarState?.activeType ?? null;
    const canUndo = toolbarState?.canUndo ?? false;
    const canRedo = toolbarState?.canRedo ?? false;
    const isBoldActive = toolbarState?.isBold ?? false;
    const isItalicActive = toolbarState?.isItalic ?? false;
    const isUnderlineActive = toolbarState?.isUnderline ?? false;
    const isMultiBlockSelection = toolbarState?.isMultiBlockSelection ?? false;

    const activeBlockInfo = useMemo(() => {
        if (!activeType) {
            return null;
        }

        const option = BLOCKS.find(block => block.type === activeType);

        return {
            type: activeType,
            icon: BLOCK_ICONS[activeType],
            label: option?.label ?? 'Block',
        };
    }, [activeType]);

    const canChangeBlockType = hasEditorFocus && (
        isMultiBlockSelection
        || (Boolean(activeBlockInfo) && activeType !== 'act')
    );
    const visibleBlockInfo = useMemo(() => {
        if (!canChangeBlockType) {
            return null;
        }

        if (isMultiBlockSelection) {
            return {
                icon: null,
                label: 'Selected blocks',
            };
        }

        return activeBlockInfo;
    }, [
        activeBlockInfo,
        canChangeBlockType,
        isMultiBlockSelection,
    ]);

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
        isMultiBlockSelection,
    };
};

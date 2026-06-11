import {
    ELEMENT_ACT,
    ELEMENT_ACTION,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    type FountainElementType,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState,
} from 'react';

import {FOUNTAIN_BLOCKS_WITHOUT_ACT} from '../blocks/fountainBlockRegistry';
import {useExclusiveOverlay} from '../hooks/useExclusiveOverlay';
import {updateBlockType} from '../tiptap/fountainBlock/commands';
import {
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';
import styles from './EditorToolbar.module.css';
import {BlockTypeSelect} from './toolbar/BlockTypeSelect';
import type {
    BlockTypeSelectActions,
    BlockTypeSelectState,
    InlineMarksGroupActions,
    InlineMarksGroupState,
} from './toolbar/contracts';
import {InlineMarksGroup} from './toolbar/InlineMarksGroup';
import {useDropdownDismiss} from './toolbar/useDropdownDismiss';
import {useToolbarState} from './toolbar/useToolbarState';

interface EditorToolbarProps {
    editor: TiptapEditor | null,
}

const MULTI_BLOCK_ALLOWED_TYPES = new Set<FountainElementType>([
    ELEMENT_ACTION,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
]);

const MULTI_BLOCK_OPTIONS = FOUNTAIN_BLOCKS_WITHOUT_ACT.filter(option => MULTI_BLOCK_ALLOWED_TYPES.has(option.type));

const EditorToolbar = ({editor}: EditorToolbarProps) => {
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const {
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
    } = useToolbarState({editor});

    useDropdownDismiss({
        isOpen,
        setIsOpen,
        dropdownRef,
    });

    useExclusiveOverlay(isOpen, () => setIsOpen(false));

    useEffect(() => {
        setIsOpen(false);
    }, [activeType, isMultiBlockSelection]);

    useEffect(() => {
        if (!canChangeBlockType && isOpen) {
            setIsOpen(false);
        }
    }, [canChangeBlockType, isOpen]);

    useEffect(() => {
        if (toolbarRef.current) {
            toolbarRef.current.dataset.editorToolbar = 'true';
        }
    }, []);

    const handleUndoMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (canUndo) {
            editor
                ?.chain()
                .focus()
                .undo()
                .run();
        }
    }, [canUndo, editor]);
    const handleRedoMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (canRedo) {
            editor
                ?.chain()
                .focus()
                .redo()
                .run();
        }
    }, [canRedo, editor]);
    const handleBoldMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        editor
            ?.chain()
            .focus()
            .toggleBold()
            .run();
    }, [editor]);
    const handleItalicMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        editor
            ?.chain()
            .focus()
            .toggleItalic()
            .run();
    }, [editor]);
    const handleUnderlineMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        editor
            ?.chain()
            .focus()
            .toggleUnderline()
            .run();
    }, [editor]);
    const handleSelectMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!canChangeBlockType) {
            return;
        }

        setIsOpen(prev => !prev);
    }, [canChangeBlockType]);
    const handleMenuItemMouseDown = useCallback((
        optionType: FountainElementType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        setIsOpen(false);
        if (!editor) {
            return;
        }

        if (isMultiBlockSelection) {
            const {from, to} = editor.state.selection;
            let tr = editor.state.tr;
            let didChange = false;

            editor.state.doc.nodesBetween(from, to, (node, pos) => {
                if (!isFountainBlockNodeName(node.type.name)) {
                    return true;
                }

                if (node.attrs.blockType === ELEMENT_ACT || node.attrs.blockType === optionType) {
                    return false;
                }

                tr = tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    blockType: optionType,
                });
                didChange = true;

                return false;
            });

            if (!didChange) {
                return;
            }

            editor.commands.focus();
            editor.view.dispatch(tr);

            return;
        }

        if (optionType === activeBlockInfo?.type || activeBlockInfo?.type === ELEMENT_ACT) {
            return;
        }

        updateBlockType(editor, normalizeFountainBlockType(optionType));
    }, [
        activeBlockInfo?.type,
        editor,
        isMultiBlockSelection,
    ]);

    const inlineMarksState: InlineMarksGroupState = {
        canUndo,
        canRedo,
        isBoldActive,
        isItalicActive,
        isUnderlineActive,
    };
    const inlineMarksActions: InlineMarksGroupActions = {
        onUndoMouseDown: handleUndoMouseDown,
        onRedoMouseDown: handleRedoMouseDown,
        onBoldMouseDown: handleBoldMouseDown,
        onItalicMouseDown: handleItalicMouseDown,
        onUnderlineMouseDown: handleUnderlineMouseDown,
    };
    const blockTypeState: BlockTypeSelectState = {
        isOpen,
        canChangeBlockType,
        visibleBlockInfo,
        activeBlockInfo,
    };
    const blockTypeActions: BlockTypeSelectActions = {
        onSelectMouseDown: handleSelectMouseDown,
        onMenuItemMouseDown: handleMenuItemMouseDown,
    };

    return (
        <div
            className={styles.toolbar}
            ref={toolbarRef}
            data-editor-toolbar="true"
        >
            <InlineMarksGroup
                state={inlineMarksState}
                actions={inlineMarksActions}
            />
            <BlockTypeSelect
                options={isMultiBlockSelection ? MULTI_BLOCK_OPTIONS : FOUNTAIN_BLOCKS_WITHOUT_ACT}
                dropdownRef={dropdownRef}
                state={blockTypeState}
                actions={blockTypeActions}
            />
        </div>
    );
};

export default EditorToolbar;

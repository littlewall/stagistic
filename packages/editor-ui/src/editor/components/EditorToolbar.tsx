import {ELEMENT_ACT, type FountainElementType} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState,
} from 'react';

import {FOUNTAIN_BLOCKS_WITHOUT_ACT} from '../blocks/fountainBlockRegistry';
import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';
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
    } = useToolbarState({editor});

    useDropdownDismiss({
        isOpen,
        setIsOpen,
        dropdownRef,
    });

    useEffect(() => {
        setIsOpen(false);
    }, [activeType]);

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

        if (optionType === activeBlockInfo?.type) {
            return;
        }

        if (activeBlockInfo?.type === ELEMENT_ACT) {
            return;
        }

        editor
            .chain()
            .focus()
            .updateAttributes(FOUNTAIN_BLOCK_NODE_NAME, {blockType: optionType})
            .run();
    }, [activeBlockInfo?.type, editor]);

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
                options={FOUNTAIN_BLOCKS_WITHOUT_ACT}
                dropdownRef={dropdownRef}
                state={blockTypeState}
                actions={blockTypeActions}
            />
        </div>
    );
};

export default EditorToolbar;

import {type BlockShortcut, type ScriptBlockNodeType} from '@stagistic/script';
import {
    ReadOnlyNotice,
    SearchControl,
    type SearchControlFilter,
    useDropdownDismiss,
} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCKS, BLOCKS_WITHOUT_ACT} from '../blocks/blockRegistry';
import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import type {EditorSearchProps} from '../contracts';
import {useEditorSearch} from '../hooks/useEditorSearch';
import {useExclusiveOverlay} from '../hooks/useExclusiveOverlay';
import {getToolbarShortcutLabels} from '../model/toolbarShortcutLabels';
import {updateBlockType, updateBlockTypeForSelection} from '../tiptap/scriptBlock/commands';
import {normalizeBlockNodeType} from '../tiptap/scriptCore';
import styles from './EditorToolbar.module.css';
import {BlockTypeSelect} from './toolbar/BlockTypeSelect';
import type {
    BlockTypeSelectActions,
    BlockTypeSelectState,
    InlineMarksGroupActions,
    InlineMarksGroupState,
} from './toolbar/contracts';
import {InlineMarksGroup} from './toolbar/InlineMarksGroup';
import {useToolbarState} from './toolbar/useToolbarState';

interface EditorToolbarProps {
    editor: TiptapEditor | null,
    blockShortcuts?: Partial<Record<ScriptBlockNodeType, BlockShortcut>>,
    search?: EditorSearchProps,
    /** Only search remains: no formatting, block types, undo or replace. */
    isReadOnly?: boolean,
    /** Shown in place of the formatting controls while read-only. */
    readOnlyLabel?: string | null,
}

const MULTI_BLOCK_ALLOWED_TYPES = new Set<ScriptBlockNodeType>([
    'stageDirection',
    'dialogue',
    'lyrics',
]);

const MULTI_BLOCK_OPTIONS = BLOCKS_WITHOUT_ACT.filter(option => MULTI_BLOCK_ALLOWED_TYPES.has(option.type));

const SEARCH_BLOCK_OPTIONS = BLOCKS.map(block => ({
    value: block.type,
    label: block.label,
    icon: BLOCK_ICONS[block.type],
}));

const EditorToolbar = ({
    editor,
    blockShortcuts,
    search: searchProps,
    isReadOnly = false,
    readOnlyLabel = null,
}: EditorToolbarProps) => {
    const searchShortcuts = getToolbarShortcutLabels();
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const {
        inputRef,
        query,
        currentResult,
        resultCount,
        onQueryChange,
        onInputKeyDown,
        onClear,
        onPreviousResult,
        onNextResult,
        isCaseSensitive,
        onCaseSensitiveChange,
        isWholeWord,
        onWholeWordChange,
        isReplaceOpen,
        onReplaceOpenChange,
        replacement,
        onReplacementChange,
        onReplace,
        onReplaceAll,
        canReplace,
        replaceInputRef,
        blockTypes,
        onBlockTypesChange,
    } = useEditorSearch({editor, search: searchProps});
    const searchFilter = useMemo<SearchControlFilter>(() => ({
        label: 'Search in',
        allLabel: 'All blocks',
        options: SEARCH_BLOCK_OPTIONS,
        value: blockTypes,
        onChange: values => onBlockTypesChange(
            SEARCH_BLOCK_OPTIONS.filter(option => values.includes(option.value)).map(option => option.value),
        ),
    }), [blockTypes, onBlockTypesChange]);
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

    useDropdownDismiss(isOpen, setIsOpen, dropdownRef);

    useExclusiveOverlay(isOpen, () => setIsOpen(false));

    const [previousSelection, setPreviousSelection] = useState({activeType, isMultiBlockSelection});

    if (previousSelection.activeType !== activeType || previousSelection.isMultiBlockSelection !== isMultiBlockSelection) {
        setPreviousSelection({activeType, isMultiBlockSelection});
        setIsOpen(false);
    }

    if (!canChangeBlockType && isOpen) {
        setIsOpen(false);
    }

    useEffect(() => {
        if (toolbarRef.current) {
            toolbarRef.current.dataset.editorToolbar = 'true';
        }
    }, []);

    const handleUndoMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();

            if (canUndo) {
                editor?.chain().focus().undo()
                    .run();
            }
        },
        [canUndo, editor],
    );
    const handleRedoMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();

            if (canRedo) {
                editor?.chain().focus().redo()
                    .run();
            }
        },
        [canRedo, editor],
    );
    const handleBoldMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            editor?.chain().focus().toggleBold()
                .run();
        },
        [editor],
    );
    const handleItalicMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            editor?.chain().focus().toggleItalic()
                .run();
        },
        [editor],
    );
    const handleUnderlineMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            editor?.chain().focus().toggleUnderline()
                .run();
        },
        [editor],
    );
    const handleSelectMouseDown = useCallback(
        (event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();

            if (!canChangeBlockType) {
                return;
            }

            setIsOpen(prev => !prev);
        },
        [canChangeBlockType],
    );
    const handleMenuItemMouseDown = useCallback(
        (optionType: ScriptBlockNodeType, event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            setIsOpen(false);

            if (!editor) {
                return;
            }

            if (isMultiBlockSelection) {
                updateBlockTypeForSelection(editor, optionType);

                return;
            }

            if (optionType === activeBlockInfo?.type || activeBlockInfo?.type === 'act') {
                return;
            }

            updateBlockType(editor, normalizeBlockNodeType(optionType));
        },
        [
            activeBlockInfo?.type,
            editor,
            isMultiBlockSelection,
        ],
    );

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
        <div className={styles.toolbar} ref={toolbarRef} data-editor-toolbar="true">
            {isReadOnly ? <ReadOnlyNotice label={readOnlyLabel} /> : (
                <>
                    <InlineMarksGroup state={inlineMarksState} actions={inlineMarksActions} />
                    <span className={styles.divider} aria-hidden="true" />
                    <BlockTypeSelect
                        options={isMultiBlockSelection ? MULTI_BLOCK_OPTIONS : BLOCKS_WITHOUT_ACT}
                        blockShortcuts={blockShortcuts}
                        dropdownRef={dropdownRef}
                        state={blockTypeState}
                        actions={blockTypeActions}
                    />
                </>
            )}
            <span className={styles.spacer} />
            <SearchControl
                ref={inputRef}
                value={query}
                currentResult={currentResult}
                resultCount={resultCount}
                aria-label="Search script"
                placeholder="Find in script…"
                onChange={onQueryChange}
                onKeyDown={onInputKeyDown}
                onClear={onClear}
                onPreviousResult={onPreviousResult}
                onNextResult={onNextResult}
                isCaseSensitive={isCaseSensitive}
                onCaseSensitiveChange={onCaseSensitiveChange}
                isWholeWord={isWholeWord}
                onWholeWordChange={onWholeWordChange}
                filter={searchFilter}
                replace={isReadOnly ? undefined : {
                    isOpen: isReplaceOpen,
                    onOpenChange: onReplaceOpenChange,
                    value: replacement,
                    onChange: onReplacementChange,
                    onReplace: onReplace,
                    onReplaceAll: onReplaceAll,
                    isDisabled: !canReplace,
                    inputRef: replaceInputRef,
                }}
                shortcuts={searchShortcuts}
            />
        </div>
    );
};

export default EditorToolbar;

import {redoDepth, undoDepth} from '@tiptap/pm/history';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';
import clsx from 'clsx';
import {
    Bold,
    Italic,
    Redo,
    Underline,
    Undo,
} from 'iconoir-react';
import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
} from '../tiptap/fountainCore';
import styles from './EditorToolbar.module.css';

type EditorToolbarProps = {
    editor: TiptapEditor | null,
};

const EditorToolbar = ({editor}: EditorToolbarProps) => {
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const toolbarState = useEditorState({
        editor,
        selector: ({editor: stateEditor}) => {
            if (!stateEditor) {
                return {
                    activeType: null,
                    canRedo: false,
                    canUndo: false,
                };
            }

            const activeBlock = getActiveFountainBlockFromState(
                stateEditor.state,
                FOUNTAIN_BLOCK_NODE_NAME,
            );

            return {
                activeType: activeBlock?.blockType ?? null,
                canRedo: redoDepth(stateEditor.state) > 0,
                canUndo: undoDepth(stateEditor.state) > 0,
            };
        },
        equalityFn: (a, b) => Boolean(
            a
            && b
            && a.activeType === b.activeType
            && a.canRedo === b.canRedo
            && a.canUndo === b.canUndo,
        ),
    });

    const activeType = toolbarState?.activeType ?? null;
    const canUndo = toolbarState?.canUndo ?? false;
    const canRedo = toolbarState?.canRedo ?? false;

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

    useEffect(() => {
        setIsOpen(false);
    }, [activeType]);

    useEffect(() => {
        if (toolbarRef.current) {
            toolbarRef.current.dataset.editorToolbar = 'true';
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!dropdownRef.current) {
                return;
            }

            if (dropdownRef.current.contains(event.target as Node)) {
                return;
            }

            setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

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
        if (!activeBlockInfo) {
            return;
        }

        setIsOpen(prev => !prev);
    }, [activeBlockInfo]);
    const handleMenuItemMouseDown = useCallback((
        optionType: (typeof FOUNTAIN_BLOCKS)[number]['type'],
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

        editor
            .chain()
            .focus()
            .updateAttributes(FOUNTAIN_BLOCK_NODE_NAME, {blockType: optionType})
            .run();
    }, [activeBlockInfo?.type, editor]);

    return (
        <div
            className={styles.toolbar}
            ref={toolbarRef}
            data-editor-toolbar="true"
        >
            <div className={styles.group}>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Undo"
                    disabled={!canUndo}
                    onMouseDown={handleUndoMouseDown}
                >
                    <Undo aria-hidden="true" />
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Redo"
                    disabled={!canRedo}
                    onMouseDown={handleRedoMouseDown}
                >
                    <Redo aria-hidden="true" />
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Bold"
                    onMouseDown={handleBoldMouseDown}
                >
                    <Bold aria-hidden="true" />
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Italic"
                    onMouseDown={handleItalicMouseDown}
                >
                    <Italic aria-hidden="true" />
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Underline"
                    onMouseDown={handleUnderlineMouseDown}
                >
                    <Underline aria-hidden="true" />
                </button>
            </div>
            <div className={styles.rightGroup}>
                <div
                    className={clsx(styles.group, styles.dropdown)}
                    ref={dropdownRef}
                >
                    <button
                        className={styles.selectButton}
                        type="button"
                        aria-label="Change block type"
                        aria-expanded={isOpen}
                        disabled={!activeBlockInfo}
                        onMouseDown={handleSelectMouseDown}
                    >
                        <span className={clsx(styles.selectIcon, !activeBlockInfo?.icon && styles.selectIconMuted)}>
                            {activeBlockInfo?.icon ?? (
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    focusable="false"
                                >
                                    <path d="M6 12h12" />
                                </svg>
                            )}
                        </span>
                        <span className={styles.selectLabel}>
                            {activeBlockInfo?.label ?? 'Select block in editor'}
                        </span>
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                            className={styles.chevron}
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                    {isOpen && (
                        <div className={styles.menu} role="menu">
                            {FOUNTAIN_BLOCKS.map(option => (
                                <button
                                    key={option.type}
                                    type="button"
                                    role="menuitem"
                                    className={clsx(
                                        styles.menuItem,
                                        option.type === activeBlockInfo?.type && styles.menuItemActive,
                                    )}
                                    aria-label={`Set block type to ${option.label}`}
                                    onMouseDown={event => handleMenuItemMouseDown(option.type, event)}
                                >
                                    <span className={styles.icon}>
                                        {BLOCK_ICONS[option.type]}
                                    </span>
                                    <span className={styles.menuLabel}>
                                        {option.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditorToolbar;

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
    useEditorActiveBlock,
    useEditorHistoryState,
    useEditorSessionCommands,
} from '../state/EditorStateProvider';
import styles from './EditorToolbar.module.css';

const EditorToolbar = () => {
    const {
        activeBlockPathString,
        activeBlockInfo,
    } = useEditorActiveBlock();
    const {
        canRedo,
        canUndo,
    } = useEditorHistoryState();
    const {
        redo,
        setBlockType,
        toggleMark,
        undo,
    } = useEditorSessionCommands();
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const activeBlockKey = useMemo(() => activeBlockPathString ?? null, [activeBlockPathString]);

    useEffect(() => {
        setIsOpen(false);
    }, [activeBlockKey]);

    useEffect(() => {
        // Keep toolbar ref to let the shared editor state treat toolbar as active.
        if (toolbarRef.current) {
            toolbarRef.current.dataset.editorToolbar = 'true';
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!dropdownRef.current) return;

            if (dropdownRef.current.contains(event.target as Node)) return;

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
            undo();
        }
    }, [canUndo, undo]);
    const handleRedoMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (canRedo) {
            redo();
        }
    }, [canRedo, redo]);
    const handleBoldMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        toggleMark('bold');
    }, [toggleMark]);
    const handleItalicMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        toggleMark('italic');
    }, [toggleMark]);
    const handleUnderlineMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        toggleMark('underline');
    }, [toggleMark]);
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
        setBlockType(optionType);
    }, [
        setBlockType,
    ]);

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
            <div className={clsx(styles.group, styles.dropdown)} ref={dropdownRef}>
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
                        {FOUNTAIN_BLOCKS.map((option: (typeof FOUNTAIN_BLOCKS)[number]) => (
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
    );
};

export default EditorToolbar;

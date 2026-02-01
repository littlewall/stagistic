import {
    applyBlockTypeChange,
    type FountainBlockTypeChangeTarget,
} from '@stagistic/editor-core';
import clsx from 'clsx';
import {
    Bold,
    Italic,
    Redo,
    Underline,
    Undo,
} from 'iconoir-react';
import {
    useEditorRef,
    useEditorVersion,
    useFocused,
} from 'platejs/react';
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
import styles from './EditorToolbar.module.css';

const EditorToolbar = () => {
    const editor = useEditorRef();
    const editorVersion = useEditorVersion();
    const isFocused = useFocused();
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [isEditorActive, setIsEditorActive] = useState(false);

    const activeBlock = useMemo(() => {
        if (!isEditorActive || !editor.selection) {
            return null;
        }

        return editor.api.block({at: editor.selection});
    }, [
        editor,
        editorVersion,
        isEditorActive,
    ]);

    const activeElement = useMemo(() => activeBlock?.[0] as FountainBlockTypeChangeTarget | undefined, [activeBlock]);
    const activePath = useMemo(() => activeBlock?.[1], [activeBlock]);
    const activeType = useMemo(() => activeElement?.type, [activeElement]);
    const activeOption = useMemo(
        () => FOUNTAIN_BLOCKS.find(option => option.type === activeType),
        [activeType],
    );
    const activeIcon = useMemo(
        () => activeType ? BLOCK_ICONS[activeType] : null,
        [activeType],
    );
    const canUndo = useMemo(() => (editor.history?.undos?.length ?? 0) > 0, [editor.history?.undos?.length]);
    const canRedo = useMemo(() => (editor.history?.redos?.length ?? 0) > 0, [editor.history?.redos?.length]);
    const [isOpen, setIsOpen] = useState(false);
    const activeBlockKey = useMemo(() => activePath ? activePath.join('-') : null, [activePath]);

    useEffect(() => {
        setIsOpen(false);
    }, [activeBlockKey]);

    useEffect(() => {
        const updateActive = () => {
            const activeElement = document.activeElement;

            if (!(activeElement instanceof HTMLElement)) {
                setIsEditorActive(false);

                return;
            }

            const isInEditor = !!activeElement.closest('[data-slate-editor="true"]');
            const isInToolbar = !!(toolbarRef.current && toolbarRef.current.contains(activeElement));

            setIsEditorActive(isFocused || isInEditor || isInToolbar);
        };

        updateActive();

        document.addEventListener('focusin', updateActive);
        document.addEventListener('focusout', updateActive);

        return () => {
            document.removeEventListener('focusin', updateActive);
            document.removeEventListener('focusout', updateActive);
        };
    }, [isFocused]);

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

    const toggleMark = useCallback((key: 'bold' | 'italic' | 'underline') => {
        const isActive = !!editor.api.marks()?.[key];

        if (isActive) {
            editor.tf.removeMarks(key);

            return;
        }

        editor.tf.addMark(key, true);
    }, [editor]);
    const handleUndoMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (canUndo) {
            editor.undo();
        }
    }, [canUndo, editor]);
    const handleRedoMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (canRedo) {
            editor.redo();
        }
    }, [canRedo, editor]);
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
        if (!activeType) {
            return;
        }

        setIsOpen(prev => !prev);
    }, [activeType]);
    const handleMenuItemMouseDown = useCallback((
        optionType: FountainBlockTypeChangeTarget['type'],
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        if (!activeElement || !activePath) {
            return;
        }

        if (optionType === activeType) {
            return;
        }

        setIsOpen(false);
        applyBlockTypeChange(
            editor,
            activeElement,
            activePath,
            optionType,
        );
    }, [
        activeElement,
        activePath,
        activeType,
        editor,
    ]);

    return (
        <div className={styles.toolbar} ref={toolbarRef}>
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
                    disabled={!activeType}
                    onMouseDown={handleSelectMouseDown}
                >
                    <span className={clsx(styles.selectIcon, !activeIcon && styles.selectIconMuted)}>
                        {activeIcon ?? (
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
                        {activeOption?.label ?? 'Select block in editor'}
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
                                    option.type === activeType && styles.menuItemActive,
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

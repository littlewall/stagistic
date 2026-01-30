import clsx from 'clsx';
import {
    useEditorRef,
    useEditorVersion,
    useFocused,
} from 'platejs/react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '~blocks/controls/blockIcons';
import {
    applyBlockTypeChange,
    type FountainBlockTypeChangeTarget,
} from '~blocks/fountainBlockHelpers';
import {FOUNTAIN_BLOCKS} from '~blocks/fountainBlockRegistry';

import styles from './EditorToolbar.module.css';

type EditorToolbarProps = {
    onSave?: () => void,
};

const EditorToolbar = ({onSave}: EditorToolbarProps) => {
    const editor = useEditorRef();
    const editorVersion = useEditorVersion();
    const isFocused = useFocused();
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const [isEditorActive, setIsEditorActive] = useState(false);

    const activeBlock = useMemo(() => {
        if (!isEditorActive || !editor.selection) return null;

        return editor.api.block({at: editor.selection});
    }, [
        editor,
        editorVersion,
        isEditorActive,
    ]);

    const activeElement = activeBlock?.[0] as FountainBlockTypeChangeTarget | undefined;
    const activePath = activeBlock?.[1];
    const activeType = activeElement?.type;
    const activeIcon = activeType ? BLOCK_ICONS[activeType] : null;
    const canUndo = (editor.history?.undos?.length ?? 0) > 0;
    const canRedo = (editor.history?.redos?.length ?? 0) > 0;
    const [isOpen, setIsOpen] = useState(false);
    const activeBlockKey = activePath ? activePath.join('-') : null;

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
        if (!isOpen) return;

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

    const toggleMark = (key: 'bold' | 'italic' | 'underline') => {
        const isActive = !!editor.api.marks()?.[key];

        if (isActive) {
            editor.tf.removeMarks(key);
        } else {
            editor.tf.addMark(key, true);
        }
    };

    return (
        <div className={styles.toolbar} ref={toolbarRef}>
            <div className={styles.group}>
                {onSave ? (
                    <button
                        className={styles.iconButton}
                        type="button"
                        aria-label="Save"
                        onMouseDown={event => {
                            event.preventDefault();
                            onSave();
                        }}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M5 4h12l3 3v13H5z" />
                            <path d="M8 4v6h8V4" />
                            <path d="M8 20v-6h8v6" />
                        </svg>
                    </button>
                ) : null}
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Undo"
                    disabled={!canUndo}
                    onMouseDown={event => {
                        event.preventDefault();
                        if (canUndo) editor.undo();
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path d="M7 7l-4 4 4 4" />
                        <path d="M20 11H4" />
                    </svg>
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Redo"
                    disabled={!canRedo}
                    onMouseDown={event => {
                        event.preventDefault();
                        if (canRedo) editor.redo();
                    }}
                >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path d="M17 7l4 4-4 4" />
                        <path d="M4 11h16" />
                    </svg>
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Bold"
                    onMouseDown={event => {
                        event.preventDefault();
                        toggleMark('bold');
                    }}
                >
                    <span className={styles.textIcon}>B</span>
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Italic"
                    onMouseDown={event => {
                        event.preventDefault();
                        toggleMark('italic');
                    }}
                >
                    <span className={clsx(styles.textIcon, styles.textIconItalic)}>I</span>
                </button>
                <button
                    className={styles.iconButton}
                    type="button"
                    aria-label="Underline"
                    onMouseDown={event => {
                        event.preventDefault();
                        toggleMark('underline');
                    }}
                >
                    <span className={clsx(styles.textIcon, styles.textIconUnderline)}>U</span>
                </button>
            </div>
            <div className={clsx(styles.group, styles.dropdown)} ref={dropdownRef}>
                <button
                    className={styles.selectButton}
                    type="button"
                    aria-label="Change block type"
                    aria-expanded={isOpen}
                    disabled={!activeType}
                    onMouseDown={event => {
                        event.preventDefault();
                        if (!activeType) return;

                        setIsOpen(prev => !prev);
                    }}
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
                        {FOUNTAIN_BLOCKS.find(option => option.type === activeType)
                            ?.label ?? 'Select block in editor'}
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
                {isOpen ? (
                    <div className={styles.menu} role="menu">
                        {FOUNTAIN_BLOCKS.map(option => (
                            <button
                                key={option.type}
                                type="button"
                                role="menuitem"
                                className={clsx(
                                    styles.menuItem,
                                    option.type === activeType && styles.menuItemActive,
                                )}
                                aria-label={`Set block type to ${option.label}`}
                                onMouseDown={event => {
                                    event.preventDefault();
                                    if (!activeElement || !activePath) return;

                                    if (option.type === activeType) return;

                                    setIsOpen(false);
                                    applyBlockTypeChange(
                                        editor,
                                        activeElement,
                                        activePath,
                                        option.type,
                                    );
                                }}
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
                ) : null}
            </div>
        </div>
    );
};

export default EditorToolbar;

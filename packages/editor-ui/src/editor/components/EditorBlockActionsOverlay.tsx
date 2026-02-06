import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
} from '../tiptap/fountainCore';
import styles from './EditorBlockActionsOverlay.module.css';

type EditorBlockActionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
};

type OverlayState = {
    style: CSSProperties,
    blockType: FountainBlockType,
    blockId: string,
};

const findBlockElement = (editor: TiptapEditor, from: number) => {
    try {
        const domAtPos = editor.view.domAtPos(from);
        let node: Node | null = domAtPos.node;

        if (node && node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        let element = node as HTMLElement | null;

        while (element && element !== editor.view.dom) {
            if (element.dataset?.fountainBlock) {
                return element;
            }

            element = element.parentElement;
        }
    } catch {
        return null;
    }

    return null;
};

const EditorBlockActionsOverlay = ({editor, canvasRef}: EditorBlockActionsOverlayProps) => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMenuAbove, setIsMenuAbove] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const updatePosition = useCallback(() => {
        const canvas = canvasRef.current;

        // Check if editor is available and mounted
        if (!editor || !editor.view || !canvas) {
            setOverlayState(null);

            return;
        }

        try {
            if (!editor.view.hasFocus() && !isMenuOpen) {
                setOverlayState(null);

                return;
            }
        } catch {
            // Editor view may not be available
            setOverlayState(null);

            return;
        }

        if (isSelectionAcrossBlocks(editor.state, FOUNTAIN_BLOCK_NODE_NAME)) {
            setOverlayState(null);

            return;
        }

        const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (!activeBlock) {
            setOverlayState(null);

            return;
        }

        const target = findBlockElement(editor, activeBlock.from);

        if (!target) {
            setOverlayState(null);

            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const computed = window.getComputedStyle(target);
        const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
        const lineHeightValue = Number.parseFloat(computed.lineHeight);
        const lineOffset = Number.isFinite(lineHeightValue) ? lineHeightValue / 2 : 0;
        const top = targetRect.top - canvasRect.top + canvas.scrollTop + paddingTop + lineOffset;
        const left = targetRect.left - canvasRect.left + canvas.scrollLeft;

        setOverlayState(prev => {
            const nextState = {
                style: {
                    top,
                    left,
                    width: targetRect.width,
                },
                blockType: activeBlock.blockType,
                blockId: activeBlock.id,
            };

            if (!prev) {
                return nextState;
            }

            if (
                prev.blockId === nextState.blockId
                && prev.blockType === nextState.blockType
                && prev.style.top === nextState.style.top
                && prev.style.left === nextState.style.left
                && prev.style.width === nextState.style.width
            ) {
                return prev;
            }

            return nextState;
        });
    }, [
        canvasRef,
        editor,
        isMenuOpen,
    ]);

    const scheduleUpdatePosition = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            updatePosition();
        });
    }, [updatePosition]);

    useLayoutEffect(() => {
        scheduleUpdatePosition();
    }, [scheduleUpdatePosition]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => scheduleUpdatePosition();

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);
        editor.on('focus', handleUpdate);
        editor.on('blur', handleUpdate);

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
            editor.off('focus', handleUpdate);
            editor.off('blur', handleUpdate);
        };
    }, [editor, scheduleUpdatePosition]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const handleScroll = () => scheduleUpdatePosition();

        canvas.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            canvas.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [canvasRef, scheduleUpdatePosition]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [overlayState?.blockId]);

    useEffect(() => {
        if (!overlayState) {
            setIsMenuOpen(false);
        }
    }, [overlayState]);

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            const target = event.target as Node;

            if (menuRef.current && menuRef.current.contains(target)) return;

            if (triggerRef.current && triggerRef.current.contains(target)) return;

            setIsMenuOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isMenuOpen]);

    useLayoutEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        let rafId = 0;
        const updatePlacement = () => {
            const trigger = triggerRef.current;
            const menu = menuRef.current;

            if (!trigger || !menu) {
                return;
            }

            const triggerRect = trigger.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const containerRect = canvasRef.current?.getBoundingClientRect() ?? null;
            const spaceBelow = containerRect
                ? containerRect.bottom - triggerRect.bottom
                : window.innerHeight - triggerRect.bottom;
            const spaceAbove = containerRect
                ? triggerRect.top - containerRect.top
                : triggerRect.top;
            const shouldFlip = spaceBelow < menuRect.height + 8 && spaceAbove > spaceBelow;

            setIsMenuAbove(shouldFlip);
        };

        const schedule = () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(updatePlacement);
        };

        schedule();

        const resizeObserver = new ResizeObserver(() => {
            // Check if menu is still mounted before scheduling update
            if (menuRef.current) {
                schedule();
            }
        });

        if (menuRef.current) {
            resizeObserver.observe(menuRef.current);
        }

        window.addEventListener('resize', schedule);

        return () => {
            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            resizeObserver.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [canvasRef, isMenuOpen]);

    const activeBlockInfo = useMemo(() => {
        if (!overlayState) {
            return null;
        }

        const option = FOUNTAIN_BLOCKS.find(block => block.type === overlayState.blockType);

        return {
            label: option?.label ?? 'Block',
            icon: BLOCK_ICONS[overlayState.blockType],
        };
    }, [overlayState]);

    const handleTriggerMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsMenuOpen(prev => !prev);
        editor?.commands.focus();
    }, [editor]);

    const handleMenuItemMouseDown = useCallback((
        optionType: (typeof FOUNTAIN_BLOCKS)[number]['type'],
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setIsMenuOpen(false);

        if (!editor || !overlayState) {
            return;
        }

        if (optionType === overlayState.blockType) {
            return;
        }

        editor
            .chain()
            .focus()
            .updateAttributes(FOUNTAIN_BLOCK_NODE_NAME, {
                blockType: optionType,
                id: overlayState.blockId,
            })
            .run();
    }, [editor, overlayState]);

    if (!overlayState || !editor) {
        return null;
    }

    return (
        <div className={styles.overlay} style={overlayState.style}>
            <div className={styles.controls}>
                <button
                    className={clsx(styles.trigger, isMenuOpen && styles.triggerOpen)}
                    type="button"
                    aria-label={`Change block type (current: ${activeBlockInfo?.label ?? 'Block'})`}
                    aria-expanded={isMenuOpen}
                    ref={triggerRef}
                    onMouseDown={handleTriggerMouseDown}
                >
                    <span className={styles.triggerIcon}>
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
                </button>
                {isMenuOpen && (
                    <div
                        className={clsx(styles.menu, isMenuAbove && styles.menuAbove)}
                        role="menu"
                        ref={menuRef}
                    >
                        {FOUNTAIN_BLOCKS.map(option => (
                            <button
                                key={option.type}
                                type="button"
                                role="menuitem"
                                className={clsx(
                                    styles.menuItem,
                                    option.type === overlayState.blockType && styles.menuItemActive,
                                )}
                                onMouseDown={event => handleMenuItemMouseDown(option.type, event)}
                            >
                                <span className={styles.menuItemIcon}>
                                    {BLOCK_ICONS[option.type]}
                                </span>
                                <span className={styles.menuItemLabel}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditorBlockActionsOverlay;

import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';
import {BlockActionsMenu} from './blockActions/BlockActionsMenu';
import {useMenuPlacement} from './blockActions/useMenuPlacement';
import {useOverlayPosition} from './blockActions/useOverlayPosition';
import styles from './EditorBlockActionsOverlay.module.css';

type EditorBlockActionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
};

const EditorBlockActionsOverlay = ({editor, canvasRef}: EditorBlockActionsOverlayProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const {overlayState} = useOverlayPosition({
        editor,
        canvasRef,
        isMenuOpen,
    });
    const {isMenuAbove} = useMenuPlacement({
        isMenuOpen,
        canvasRef,
        triggerRef,
        menuRef,
    });

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

            if (menuRef.current && menuRef.current.contains(target)) {
                return;
            }

            if (triggerRef.current && triggerRef.current.contains(target)) {
                return;
            }

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
                {isMenuOpen ? (
                    <BlockActionsMenu
                        blockType={overlayState.blockType}
                        isMenuAbove={isMenuAbove}
                        menuRef={menuRef}
                        onMenuItemMouseDown={handleMenuItemMouseDown}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default EditorBlockActionsOverlay;

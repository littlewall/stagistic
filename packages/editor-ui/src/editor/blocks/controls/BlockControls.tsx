import {BlockMenuPlugin, BlockSelectionPlugin} from '@platejs/selection/react';
import {applyBlockTypeChange, type FountainElement} from '@stagistic/editor-core';
import clsx from 'clsx';
import {
    useEditorRef,
    useElement,
    useFocused,
    usePath,
    usePluginOption,
    useSelected,
    useSelectionVersion,
} from 'platejs/react';
import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {Path, Range} from 'slate';

import {FOUNTAIN_BLOCKS} from '../fountainBlockRegistry';
import styles from './BlockControls.module.css';
import {BLOCK_ICONS} from './blockIcons';

type BlockOptionType = (typeof FOUNTAIN_BLOCKS)[number]['type'];

const BlockControls = () => {
    const editor = useEditorRef();
    const element = useElement<FountainElement>();
    const path = usePath();
    const selectionVersion = useSelectionVersion();
    let elementPath: Path;

    try {
        elementPath = path ?? editor.api.findPath(element);
    } catch {
        return null;
    }

    const isFocused = useFocused();
    const isSelected = useSelected();
    const selectedIds = usePluginOption(BlockSelectionPlugin, 'selectedIds');
    const blockId = useMemo(() => elementPath.join('-'), [elementPath]);
    const openId = usePluginOption(BlockMenuPlugin, 'openId');
    const isOpen = useMemo(() => openId === blockId, [openId, blockId]);
    const activeOption = useMemo(
        () => FOUNTAIN_BLOCKS.find(option => option.type === element.type),
        [element.type],
    );
    const activeIcon = useMemo(
        () => BLOCK_ICONS[element.type],
        [element.type],
    );
    const activeLabel = useMemo(() => activeOption?.label ?? 'Block', [activeOption]);
    const blockMenuApi = useMemo(() => editor.getApi(BlockMenuPlugin).blockMenu, [editor]);
    const hasMultiBlockSelection = useMemo(() => {
        if ((selectedIds?.size ?? 0) > 1) {
            return true;
        }

        const selection = editor.selection;

        if (!selection || Range.isCollapsed(selection)) {
            return false;
        }

        const anchorBlock = editor.api.block({at: selection.anchor});
        const focusBlock = editor.api.block({at: selection.focus});

        if (!anchorBlock || !focusBlock) {
            return false;
        }

        return !Path.equals(anchorBlock[1], focusBlock[1]);
    }, [
        editor,
        selectedIds,
        selectionVersion,
    ]);
    const shouldShowControls = useMemo(() => isFocused && isSelected && !hasMultiBlockSelection, [
        isFocused,
        isSelected,
        hasMultiBlockSelection,
    ]);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLSpanElement | null>(null);
    const [isMenuAbove, setIsMenuAbove] = useState(false);
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const scrollLockRef = useRef<{el: HTMLElement, overflow: string} | null>(null);
    const handleTriggerMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isOpen) {
            blockMenuApi.hide();

            return;
        }

        blockMenuApi.show(blockId);
    }, [
        blockId,
        blockMenuApi,
        isOpen,
    ]);
    const handleMenuItemMouseDown = useCallback((
        optionType: BlockOptionType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        blockMenuApi.hide();
        applyBlockTypeChange(editor, element, elementPath, optionType);
    }, [
        blockMenuApi,
        editor,
        element,
        elementPath,
    ]);

    useEffect(() => {
        if (!shouldShowControls && openId === blockId) {
            blockMenuApi.hide();
        }
    }, [
        blockId,
        blockMenuApi,
        openId,
        shouldShowControls,
    ]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            const target = event.target as Node | null;

            if (menuRef.current && menuRef.current.contains(target)) return;

            if (triggerRef.current && triggerRef.current.contains(target)) return;

            blockMenuApi.hide();
        };

        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [blockMenuApi, isOpen]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        let rafId = 0;
        const updatePlacement = () => {
            if (!triggerRef.current || !menuRef.current) return;

            const triggerRect = triggerRef.current.getBoundingClientRect();
            const menuRect = menuRef.current.getBoundingClientRect();
            const container = scrollContainerRef.current;
            const containerRect = container
                ? container.getBoundingClientRect()
                : null;
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
            if (rafId) cancelAnimationFrame(rafId);

            rafId = requestAnimationFrame(updatePlacement);
        };

        schedule();

        const resizeObserver = new ResizeObserver(schedule);

        if (menuRef.current) resizeObserver.observe(menuRef.current);

        window.addEventListener('resize', schedule);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);

            resizeObserver.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            if (scrollLockRef.current) {
                scrollLockRef.current.el.style.overflow = scrollLockRef.current.overflow;
                scrollLockRef.current = null;
            }

            return;
        }

        const findScrollContainer = (node: HTMLElement | null) => {
            let current = node?.parentElement ?? null;

            while (current) {
                const style = getComputedStyle(current);
                const overflowY = style.overflowY;

                if (overflowY === 'auto' || overflowY === 'scroll') {
                    return current;
                }

                current = current.parentElement;
            }

            return null;
        };

        const container = findScrollContainer(triggerRef.current);

        scrollContainerRef.current = container;

        if (container) {
            scrollLockRef.current = {
                el: container,
                overflow: container.style.overflow,
            };
            container.style.overflow = 'hidden';
        }

        return () => {
            if (scrollLockRef.current) {
                scrollLockRef.current.el.style.overflow = scrollLockRef.current.overflow;
                scrollLockRef.current = null;
            }
        };
    }, [isOpen]);

    if (!shouldShowControls) {
        return null;
    }

    return (
        <span className={styles.controls}>
            <button
                className={styles.trigger}
                type="button"
                aria-label={`Change block type (current: ${activeLabel})`}
                aria-expanded={isOpen}
                ref={triggerRef}
                onMouseDown={handleTriggerMouseDown}
            >
                <span className={styles.triggerIcon}>{activeIcon}</span>
            </button>
            {isOpen ? (
                <span
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
                                option.type === element.type && styles.menuItemActive,
                            )}
                            onMouseDown={event => handleMenuItemMouseDown(option.type, event)}
                        >
                            <span className={styles.menuItemIcon}>
                                {BLOCK_ICONS[option.type]}
                            </span>
                            <span className={styles.menuItemLabel}>{option.label}</span>
                        </button>
                    ))}
                </span>
            ) : null}
        </span>
    );
};

export default BlockControls;

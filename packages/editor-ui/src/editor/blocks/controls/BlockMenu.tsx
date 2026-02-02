import {BlockMenuPlugin} from '@platejs/selection/react';
import {applyBlockTypeChange, type FountainElement} from '@stagistic/editor-core';
import clsx from 'clsx';
import {useEditorRef, usePluginOption} from 'platejs/react';
import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {type Path} from 'slate';

import {FOUNTAIN_BLOCKS} from '../fountainBlockRegistry';
import styles from './BlockControls.module.css';
import {BLOCK_ICONS} from './blockIcons';

type BlockOptionType = (typeof FOUNTAIN_BLOCKS)[number]['type'];

type BlockMenuProps = {
    blockId: string,
    element: FountainElement,
    path: Path,
    triggerRef: React.RefObject<HTMLElement>,
};

/*
 * Separate component that only renders when menu should be open
 * This avoids having usePluginOption in every BlockControls
 */
const BlockMenu = ({
    blockId,
    element,
    path,
    triggerRef,
}: BlockMenuProps) => {
    const editor = useEditorRef();
    const openId = usePluginOption(BlockMenuPlugin, 'openId');
    const isOpen = openId === blockId;
    const blockMenuApi = editor.getApi(BlockMenuPlugin).blockMenu;

    const menuRef = useRef<HTMLSpanElement | null>(null);
    const [isMenuAbove, setIsMenuAbove] = useState(false);
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const scrollLockRef = useRef<{el: HTMLElement, overflow: string} | null>(null);

    const handleMenuItemMouseDown = useCallback((
        optionType: BlockOptionType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        blockMenuApi.hide();
        applyBlockTypeChange(editor, element, path, optionType);
    }, [
        blockMenuApi,
        editor,
        element,
        path,
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
    }, [
        blockMenuApi,
        isOpen,
        triggerRef,
    ]);

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
    }, [isOpen, triggerRef]);

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
    }, [isOpen, triggerRef]);

    if (!isOpen) return null;

    return (
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
    );
};

export default BlockMenu;

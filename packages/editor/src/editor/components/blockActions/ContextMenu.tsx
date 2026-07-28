import clsx from 'clsx';
import {
    type CSSProperties,
    type KeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type MouseEventHandler,
    type ReactNode,
    type RefObject,
    useEffect,
    useState,
} from 'react';

import styles from '../EditorBlockActionsOverlay.module.css';

export interface ContextMenuCommand {
    kind: 'command',
    id: string,
    label: string,
    detail?: string,
    icon: ReactNode,
    isActive?: boolean,
    onClick?: MouseEventHandler<HTMLButtonElement>,
    onMouseDown?: MouseEventHandler<HTMLButtonElement>,
}

export interface ContextMenuSubmenu {
    kind: 'submenu',
    id: string,
    label: string,
    icon: ReactNode,
    items: readonly ContextMenuCommand[],
}

export type ContextMenuItem = ContextMenuCommand | ContextMenuSubmenu;

interface ContextMenuProps {
    ariaLabel: string,
    items: readonly ContextMenuItem[],
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    menuStyle: CSSProperties | undefined,
    positionClassName: string,
    rootDataAttributes: Record<`data-${string}`, string>,
    onClose?: () => void,
}

const MenuCaret = () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
);

const getPanelItems = (target: HTMLElement) => {
    const panel = target.closest<HTMLElement>('[data-block-menu-panel]');

    return panel
        ? Array.from(panel.querySelectorAll<HTMLButtonElement>(':scope > [role="menuitem"]'))
        : [];
};

const focusRelativeItem = (
    event: KeyboardEvent<HTMLButtonElement>,
    direction: -1 | 1,
) => {
    const items = getPanelItems(event.currentTarget);
    const currentIndex = items.indexOf(event.currentTarget);
    const nextIndex = (currentIndex + direction + items.length) % items.length;

    items[nextIndex]?.focus();
};

export const ContextMenu = ({
    ariaLabel,
    items,
    isMenuAbove,
    menuRef,
    menuStyle,
    positionClassName,
    rootDataAttributes,
    onClose,
}: ContextMenuProps) => {
    const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
    const activeSubmenu = items.find((item): item is ContextMenuSubmenu => {
        return item.kind === 'submenu' && item.id === activeSubmenuId;
    });

    useEffect(() => {
        const focusFrame = window.requestAnimationFrame(() => {
            menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
        });

        return () => window.cancelAnimationFrame(focusFrame);
    }, [menuRef]);

    const handleSubmenuParentMouseLeave = (
        event: ReactMouseEvent<HTMLButtonElement>,
        submenuId: string,
    ) => {
        const nextTarget = event.relatedTarget;
        const submenuPanel = menuRef.current?.querySelector(
            `[data-block-submenu-panel="${submenuId}"]`,
        );

        if (nextTarget instanceof Node && submenuPanel?.contains(nextTarget)) {
            return;
        }

        setActiveSubmenuId(null);
    };

    const handleSubmenuPanelMouseLeave = (event: ReactMouseEvent<HTMLDivElement>) => {
        const nextTarget = event.relatedTarget;
        const submenuParent = menuRef.current?.querySelector(
            `[data-submenu-id="${activeSubmenuId}"]`,
        );

        if (nextTarget instanceof Node && submenuParent?.contains(nextTarget)) {
            return;
        }

        setActiveSubmenuId(null);
    };

    const handleKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        item: ContextMenuItem,
        panel: 'primary' | 'secondary',
    ) => {
        const handlers: Partial<Record<string, () => void>> = {
            ArrowDown: () => focusRelativeItem(event, 1),
            ArrowUp: () => focusRelativeItem(event, -1),
            Home: () => getPanelItems(event.currentTarget)[0]?.focus(),
            End: () => getPanelItems(event.currentTarget).at(-1)?.focus(),
            Escape: onClose,
            ArrowRight: () => {
                if (item.kind !== 'submenu') {
                    return;
                }

                setActiveSubmenuId(item.id);
                window.requestAnimationFrame(() => {
                    menuRef.current
                        ?.querySelector<HTMLButtonElement>('[data-block-menu-panel="secondary"] [role="menuitem"]')
                        ?.focus();
                });
            },
            ArrowLeft: () => {
                if (panel !== 'secondary') {
                    return;
                }

                menuRef.current
                    ?.querySelector<HTMLButtonElement>(`[data-submenu-id="${activeSubmenuId}"]`)
                    ?.focus();
            },
        };
        const handler = handlers[event.key];

        if (!handler) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        handler();
    };

    const renderCommand = (
        command: ContextMenuCommand,
        panel: 'primary' | 'secondary',
    ) => {
        const accessibleLabel = command.detail
            ? `${command.label} ${command.detail}`
            : command.label;

        return (
            <button
                key={command.id}
                type="button"
                role="menuitem"
                className={clsx(styles.menuItem, command.isActive && styles.active)}
                aria-label={accessibleLabel}
                title={accessibleLabel}
                onFocus={() => panel === 'primary' && setActiveSubmenuId(null)}
                onMouseEnter={() => panel === 'primary' && setActiveSubmenuId(null)}
                onKeyDown={event => handleKeyDown(event, command, panel)}
                onClick={command.onClick}
                onMouseDown={command.onMouseDown}
            >
                <span className={styles.menuItemSurface} data-menu-item-surface>
                    <span className={styles.menuItemIcon}>{command.icon}</span>
                    <span className={styles.menuItemLabel}>
                        <span>{command.label}</span>
                        {command.detail && (
                            <span className={styles.menuItemDetail}>{command.detail}</span>
                        )}
                    </span>
                </span>
            </button>
        );
    };

    return (
        <div
            className={clsx(
                styles.menu,
                positionClassName,
                activeSubmenu && styles.withSubmenu,
                isMenuAbove && styles.above,
            )}
            ref={menuRef}
            style={menuStyle}
            {...rootDataAttributes}
        >
            <div
                className={styles.menuPrimaryPanel}
                data-block-menu-panel="primary"
                role="menu"
                aria-label={ariaLabel}
            >
                {items.map(item => {
                    if (item.kind === 'command') {
                        return renderCommand(item, 'primary');
                    }

                    return (
                        <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            className={clsx(styles.menuItem, styles.submenu)}
                            data-submenu-id={item.id}
                            aria-haspopup="menu"
                            aria-expanded={activeSubmenuId === item.id}
                            onMouseEnter={() => setActiveSubmenuId(item.id)}
                            onMouseLeave={event => handleSubmenuParentMouseLeave(event, item.id)}
                            onKeyDown={event => handleKeyDown(event, item, 'primary')}
                            onClick={() => setActiveSubmenuId(item.id)}
                        >
                            <span className={styles.menuItemSurface} data-menu-item-surface>
                                <span className={styles.menuItemIcon}>{item.icon}</span>
                                <span className={styles.menuItemLabel}>{item.label}</span>
                                <span className={styles.menuItemCaret}>
                                    <MenuCaret />
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {activeSubmenu ? (
                <div
                    className={styles.menuSecondaryPanel}
                    data-block-submenu-panel={activeSubmenu.id}
                    onMouseLeave={handleSubmenuPanelMouseLeave}
                >
                    <div
                        className={styles.menuSecondaryContent}
                        data-block-menu-panel="secondary"
                        role="menu"
                        aria-label={activeSubmenu.label}
                    >
                        {activeSubmenu.items.map(command => renderCommand(command, 'secondary'))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

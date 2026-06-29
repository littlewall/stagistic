import clsx from 'clsx';
import {
    type CSSProperties,
    type KeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    type RefObject,
    useEffect,
    useState,
} from 'react';

import {
    CueHitIcon,
    CueRangeIcon,
} from '../CueIcons';
import styles from '../EditorBlockActionsOverlay.module.css';
import type {
    BlockActionCommand,
    BlockActionIcon,
    BlockActionItem,
    BlockActionSubmenu,
} from './actionTypes';

interface BlockActionMenuProps {
    items: readonly BlockActionItem[],
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    menuStyle: CSSProperties | undefined,
    onClose: () => void,
    onExecute: (command: BlockActionCommand) => void,
}

const MenuCaret = () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
);

const CueIcon = ({icon}: {icon: BlockActionIcon}) => {
    const paths: Record<BlockActionIcon, ReactNode> = {
        cue: <CueRangeIcon />,
        cueStart: <CueRangeIcon hollowEndpoint="start" />,
        cueHit: <CueHitIcon />,
        cueOut: <CueRangeIcon hollowEndpoint="end" />,
    };

    return paths[icon];
};

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

export const BlockActionMenu = ({
    items,
    isMenuAbove,
    menuRef,
    menuStyle,
    onClose,
    onExecute,
}: BlockActionMenuProps) => {
    const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
    const activeSubmenu = items.find((item): item is BlockActionSubmenu => {
        return item.kind === 'submenu' && item.id === activeSubmenuId;
    });

    useEffect(() => {
        menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
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
        item: BlockActionItem,
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
        command: BlockActionCommand,
        panel: 'primary' | 'secondary',
    ) => (
        <button
            key={command.id}
            type="button"
            role="menuitem"
            className={styles.menuItem}
            title={command.label}
            onFocus={() => panel === 'primary' && setActiveSubmenuId(null)}
            onMouseEnter={() => panel === 'primary' && setActiveSubmenuId(null)}
            onKeyDown={event => handleKeyDown(event, command, panel)}
            onClick={() => onExecute(command)}
        >
            <span className={styles.menuItemIcon}>
                <CueIcon icon={command.icon} />
            </span>
            <span className={styles.menuItemLabel}>{command.label}</span>
        </button>
    );

    return (
        <div
            className={clsx(
                styles.menu,
                styles.actionMenu,
                activeSubmenu && styles.withSubmenu,
                isMenuAbove && styles.above,
            )}
            data-block-action-menu="true"
            ref={menuRef}
            style={menuStyle}
        >
            <div
                className={styles.menuPrimaryPanel}
                data-block-menu-panel="primary"
                role="menu"
                aria-label="Block actions"
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
                            <span className={styles.menuItemIcon}>
                                <CueIcon icon={item.icon} />
                            </span>
                            <span className={styles.menuItemLabel}>{item.label}</span>
                            <span className={styles.menuItemCaret}>
                                <MenuCaret />
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

export const MoreHorizontalIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle
            cx="6.5"
            cy="12"
            r="1.35"
        />
        <circle
            cx="12"
            cy="12"
            r="1.35"
        />
        <circle
            cx="17.5"
            cy="12"
            r="1.35"
        />
    </svg>
);

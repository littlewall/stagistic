import clsx from 'clsx';
import type {
    FocusEventHandler,
    ReactNode,
    Ref,
} from 'react';

import type {DropdownMenuItem} from '../molecules/DropdownMenu/DropdownMenu';
import {MoreActionsMenu} from '../molecules/MoreActionsMenu/MoreActionsMenu';
import styles from './SceneCard.module.css';

export interface SceneCardActions {
    /** Accessible name of the menu button, e.g. "Scene 3 actions". */
    label: string,
    items: readonly DropdownMenuItem[],
    onAction: (id: string) => void,
}

export interface SceneCardProps {
    ref?: Ref<HTMLLIElement>,
    sceneId?: string,
    onBlur?: FocusEventHandler<HTMLLIElement>,
    number: number,
    title: string,
    titleContent?: ReactNode,
    /** Sits in the gap before the card, e.g. a control that inserts a scene there. */
    before?: ReactNode,
    /** The whole card picks up for dragging; its buttons and the name being edited do not. */
    isDraggable?: boolean,
    /** Start page; null while pagination has not been measured, and then not shown. */
    page: number | null,
    /** One line of number and title, for scenes a filter leaves out. */
    variant?: 'full' | 'collapsed',
    actions?: SceneCardActions,
    /** Characters of the scene; omitted when the card shows the title only. */
    children?: ReactNode,
}

/** A scene on the Board. The title is script text and keeps the script's voice; the rest is tool chrome. */
export const SceneCard = ({
    ref,
    sceneId,
    onBlur,
    number,
    title,
    titleContent,
    before,
    isDraggable = false,
    page,
    variant = 'full',
    actions,
    children,
}: SceneCardProps) => {
    const isCollapsed = variant === 'collapsed';

    return (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Tracks focus leaving the card; it does not make the list item interactive.
        <li
            ref={ref}
            data-board-card-id={sceneId}
            data-collapsed={isCollapsed || undefined}
            onBlur={onBlur}
            className={clsx(styles.card, isCollapsed && styles.collapsed, isDraggable && styles.draggable)}
        >
            {before ? <div className={styles.before}>{before}</div> : null}
            <div className={styles.head}>
                <h3 className={styles.heading}>
                    <span className={styles.number}>{`${number}.`}</span>
                    {' '}
                    <span className={styles.title}>{titleContent ?? title}</span>
                </h3>
                {isCollapsed || page === null ? null : <span className={styles.page}>{`p. ${page}`}</span>}
                {actions ? (
                    <MoreActionsMenu
                        aria-label={actions.label}
                        items={actions.items}
                        onAction={actions.onAction}
                    />
                ) : null}
            </div>
            {isCollapsed || !children ? null : <div className={styles.body}>{children}</div>}
        </li>
    );
};

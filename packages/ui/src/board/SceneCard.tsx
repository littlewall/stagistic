import clsx from 'clsx';
import type {ReactNode} from 'react';

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
    number: number,
    title: string,
    /** Start page; null while pagination has not been measured. */
    page: number | null,
    /** One line of number and title, for scenes a filter leaves out. */
    variant?: 'full' | 'collapsed',
    actions?: SceneCardActions,
    /** Characters of the scene; omitted when the card shows the title only. */
    children?: ReactNode,
}

/** A scene on the Board. The title is script text and keeps the script's voice; the rest is tool chrome. */
export const SceneCard = ({
    number,
    title,
    page,
    variant = 'full',
    actions,
    children,
}: SceneCardProps) => {
    const isCollapsed = variant === 'collapsed';

    return (
        <li className={clsx(styles.card, isCollapsed && styles.collapsed)}>
            <div className={styles.head}>
                <h3 className={styles.heading}>
                    <span className={styles.number}>{`${number}.`}</span>
                    {' '}
                    <span className={styles.title}>{title}</span>
                </h3>
                {isCollapsed ? null : (
                    <span
                        className={styles.page}
                        title={page === null ? 'Page not measured yet' : undefined}
                    >
                        {page === null ? '–' : `p. ${page}`}
                    </span>
                )}
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

import {
    EditPencilIcon,
    IconButton,
    LinkSlashIcon,
    ListRow,
    Tooltip,
} from '@stagistic/ui';
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './ScriptMusicSidebar.module.css';
import type {ScriptMusicListItem} from './types';

interface RowActionButtonProps {
    ariaLabel: string,
    tooltipLabel: string,
    onPress: (returnFocus: HTMLElement) => void,
    children: ReactNode,
}

const RowActionButton = ({
    ariaLabel,
    tooltipLabel,
    onPress,
    children,
}: RowActionButtonProps) => (
    <Tooltip
        label={tooltipLabel}
        placement="bottom"
    >
        <IconButton
            size="xs"
            aria-label={ariaLabel}
            onMouseDown={event => {
                event.preventDefault();
            }}
            onPress={event => onPress(event.target as HTMLElement)}
        >
            {children}
        </IconButton>
    </Tooltip>
);

interface MusicRowProps {
    music: ScriptMusicListItem,
    isActive: boolean,
    number: string | null,
    startBlockId: string | null,
    onFocus: (blockId: string) => void,
    /** Absent for a saved draft or version, where music stays assigned. */
    onRequestUnassign?: (music: ScriptMusicListItem, returnFocus: HTMLElement) => void,
    /** Absent for a saved draft or version; the header's manager link stays. */
    onOpenMusicManager?: (musicId: string, returnFocus: HTMLElement) => void,
}

export const MusicRow = ({
    music,
    isActive,
    number,
    startBlockId,
    onFocus,
    onRequestUnassign,
    onOpenMusicManager,
}: MusicRowProps) => {
    const isAssigned = Boolean(music.assignmentLabel);
    const label = (
        <>
            {number ? (
                <>
                    <span className={styles.number}>{number}</span>{' '}
                </>
            ) : null}
            {music.title}
        </>
    );

    return (
        <ListRow
            as="li"
            interactive
            selected={isActive}
            /* The navigable label already carries aria-current; the row must not add aria-selected. */
            announceSelected={false}
            className={clsx(styles.row, isActive && styles.active, !startBlockId && styles.staticRow)}
            trailing={(
                <span className={styles.actions}>
                    {isAssigned && onRequestUnassign ? (
                        <RowActionButton
                            ariaLabel={`Unassign ${music.title}`}
                            tooltipLabel="Unassign music"
                            onPress={returnFocus => onRequestUnassign(music, returnFocus)}
                        >
                            <LinkSlashIcon aria-hidden="true" />
                        </RowActionButton>
                    ) : null}
                    {onOpenMusicManager ? (
                        <RowActionButton
                            ariaLabel={`Edit ${music.title}`}
                            tooltipLabel="Manage music"
                            onPress={returnFocus => onOpenMusicManager(music.id, returnFocus)}
                        >
                            <EditPencilIcon aria-hidden="true" />
                        </RowActionButton>
                    ) : null}
                </span>
            )}
        >
            {startBlockId ? (
                <button
                    type="button"
                    className={`${styles.label} ${styles.navigableLabel}`}
                    data-music-navigation="true"
                    data-music-id={music.id}
                    aria-current={isActive ? 'true' : undefined}
                    onMouseDown={event => {
                        event.preventDefault();
                    }}
                    onClick={() => onFocus(startBlockId)}
                >
                    {label}
                </button>
            ) : (
                <span className={styles.label}>{label}</span>
            )}
        </ListRow>
    );
};

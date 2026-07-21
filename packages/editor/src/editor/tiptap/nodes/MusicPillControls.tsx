import {Tooltip, TrashIcon} from '@stagistic/ui';
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './MusicPill.module.css';

export type MusicMode = 'open' | 'hit';

type MusicMenuButtonProps = {
    label: string,
    isDanger?: boolean,
    onClick: () => void,
    children: ReactNode,
};

export const keepEditorFocus = (event: {preventDefault: () => void}) => {
    event.preventDefault();
};

export const MusicMenuButton = ({
    label,
    isDanger = false,
    onClick,
    children,
}: MusicMenuButtonProps) => (
    <Tooltip label={label}>
        <button
            type="button"
            className={clsx(styles.menuButton, isDanger && styles.dangerButton)}
            aria-label={label}
            onMouseDown={keepEditorFocus}
            onClick={onClick}
        >
            <span className={styles.icon}>
                {children}
            </span>
        </button>
    </Tooltip>
);

export const MusicDeleteIcon = () => <TrashIcon aria-hidden="true" />;

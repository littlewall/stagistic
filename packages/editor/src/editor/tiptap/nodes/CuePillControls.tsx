import {Tooltip, TrashIcon} from '@stagistic/ui';
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './CuePill.module.css';

export type CueMode = 'open' | 'hit';

type CueMenuButtonProps = {
    label: string,
    isDanger?: boolean,
    onClick: () => void,
    children: ReactNode,
};

export const keepEditorFocus = (event: {preventDefault: () => void}) => {
    event.preventDefault();
};

export const CueMenuButton = ({
    label,
    isDanger = false,
    onClick,
    children,
}: CueMenuButtonProps) => (
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

export const CueDeleteIcon = () => <TrashIcon aria-hidden="true" />;

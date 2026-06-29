import {TrashIcon} from '@stagistic/ui';
import clsx from 'clsx';
import type {ReactNode} from 'react';

import {
    CueHitIcon,
    CueRangeIcon,
} from '../../components/CueIcons';
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

export const CueModeIcon = ({mode}: {mode: CueMode}) => {
    if (mode === 'hit') {
        return <CueHitIcon />;
    }

    return <CueRangeIcon />;
};

export const MoreVerticalIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <circle
            cx="12"
            cy="6.5"
            r="1.35"
        />
        <circle
            cx="12"
            cy="12"
            r="1.35"
        />
        <circle
            cx="12"
            cy="17.5"
            r="1.35"
        />
    </svg>
);

export const CueMenuButton = ({
    label,
    isDanger = false,
    onClick,
    children,
}: CueMenuButtonProps) => (
    <button
        type="button"
        className={clsx(styles.menuButton, isDanger && styles.dangerButton)}
        aria-label={label}
        title={label}
        onMouseDown={keepEditorFocus}
        onClick={onClick}
    >
        <span className={styles.icon}>
            {children}
        </span>
    </button>
);

export const CueDeleteIcon = () => <TrashIcon aria-hidden="true" />;

export const getModeButtonLabel = (mode: CueMode) => {
    return mode === 'hit' ? 'Switch cue to open' : 'Switch cue to hit';
};

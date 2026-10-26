import clsx from 'clsx';

import {LockIcon} from '../../icons';
import styles from './ReadOnlyNotice.module.css';

export interface ReadOnlyNoticeProps {
    /** The stored state on screen, e.g. “Draft #3” or a version name. */
    label?: string | null,
    /** What holds for the stored state here; defaults to “Read-only”. */
    message?: string,
    className?: string,
}

/**
 * Quiet marker that a stored draft or version is on screen and cannot change.
 * Neutral on purpose: yellow means “chosen” and “act on this”, and this is
 * neither.
 */
export const ReadOnlyNotice = ({
    label,
    message = 'Read-only',
    className,
}: ReadOnlyNoticeProps) => (
    <p className={clsx(styles.notice, className)} role="status">
        <LockIcon className={styles.icon} aria-hidden="true" />
        <span className={styles.text}>
            {label ? <span className={styles.label}>{label}</span> : null}
            {label ? ' · ' : null}
            {message}
        </span>
    </p>
);

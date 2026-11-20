import clsx from 'clsx';
import type {ComponentProps} from 'react';

import styles from './BoardKeyButton.module.css';

/** A small key-cap button beside a Board name being edited, e.g. ⏎ to confirm or × to cancel. */
export const BoardKeyButton = ({
    className,
    type = 'button',
    ...props
}: ComponentProps<'button'> & {'aria-label': string}) => (
    // oxlint-disable-next-line react/button-has-type -- The type is a prop with a default of "button".
    <button type={type} className={clsx(styles.key, className)} {...props} />
);

import clsx from 'clsx';
import {type ComponentPropsWithoutRef, type ReactElement} from 'react';

import {SearchIcon} from '../icons/ui/SearchIcon';
import styles from './SearchInput.module.css';

type SearchInputSize = 'sm' | 'md';

export type SearchInputProps = {
    size?: SearchInputSize,
    className?: string,
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>;

const SIZE_CLASS: Record<SearchInputSize, string> = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
};

export const SearchInput = ({
    size = 'md',
    className,
    ...props
}: SearchInputProps): ReactElement => (
    <div className={clsx(styles.field, SIZE_CLASS[size], className)}>
        <SearchIcon className={styles.icon} aria-hidden="true" />
        <input
            {...props}
            type="search"
            className={styles.input}
        />
    </div>
);

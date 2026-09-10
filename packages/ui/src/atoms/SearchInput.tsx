import clsx from 'clsx';
import {type ComponentPropsWithoutRef, type ReactElement} from 'react';

import {SearchIcon} from '../icons/ui/SearchIcon';
import {Input} from './Input';
import styles from './SearchInput.module.css';

/*
 * `md` is the library search (pill on a raised surface, 18px glyph); `sm` is the
 * dialog search (plain bordered field, 16px glyph). Both stand on the shared
 * control height — the size names carry the chrome, not a second height scale.
 */
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
        <Input
            {...props}
            type="search"
            className={styles.input}
        />
    </div>
);

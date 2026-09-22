import clsx from 'clsx';
import {type ComponentPropsWithoutRef, forwardRef, type ReactNode} from 'react';

import {SearchIcon} from '../icons/ui/SearchIcon';
import {Input} from './Input';

import styles from './SearchInput.module.css';

/*
 * `md` is the library search (pill on a raised surface, 18px glyph); `sm` is the
 * dialog search (plain bordered field, 16px glyph). Both stand on the shared
 * control height — the size names carry the chrome, not a second height scale.
 */
type SearchInputSize = 'sm' | 'md' | 'toolbar';

export type SearchInputProps = {
    size?: SearchInputSize;
    className?: string;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
} & Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'type' | 'size'>;

const SIZE_CLASS: Record<SearchInputSize, string> = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    toolbar: styles.sizeToolbar,
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({size = 'md', className, startAdornment, endAdornment, ...props}, ref) => {
    const resolvedStartAdornment = startAdornment === undefined ? <SearchIcon className={styles.icon} aria-hidden="true" /> : startAdornment;

    return (
        <div className={clsx(styles.field, SIZE_CLASS[size], className)}>
            {resolvedStartAdornment ? <span className={styles.startAdornment}>{resolvedStartAdornment}</span> : null}
            <Input {...props} ref={ref} type="search" className={styles.input} />
            {endAdornment ? <span className={styles.endAdornment}>{endAdornment}</span> : null}
        </div>
    );
});

SearchInput.displayName = 'SearchInput';

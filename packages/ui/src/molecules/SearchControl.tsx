import clsx from 'clsx';
import {forwardRef, useId} from 'react';

import {IconButton} from '../atoms/IconButton';
import {SearchInput, type SearchInputProps} from '../atoms/SearchInput';
import {ChevronDownIcon} from '../icons/ui/ChevronDownIcon';
import {ChevronUpIcon} from '../icons/ui/ChevronUpIcon';
import {CloseIcon} from '../icons/ui/CloseIcon';
import {SearchIcon} from '../icons/ui/SearchIcon';

import styles from './SearchControl.module.css';

export type SearchControlProps = {
    currentResult: number;
    resultCount: number;
    onPreviousResult?: () => void;
    onNextResult?: () => void;
    onClear?: () => void;
} & Omit<SearchInputProps, 'startAdornment' | 'endAdornment' | 'children' | 'onClear'>;

export const SearchControl = forwardRef<HTMLInputElement, SearchControlProps>(
    ({currentResult, resultCount, onPreviousResult, onNextResult, onClear, className, value, ...props}, ref) => {
        const generatedInputId = useId();
        const inputId = props.id ?? generatedInputId;
        const hasQuery = typeof value === 'string' && value.length > 0;
        const isNavigationDisabled = !hasQuery || resultCount === 0;
        const indicator = hasQuery ? (
            <output className={styles.indicator} aria-label="Search result position" aria-live="polite" aria-atomic="true">
                {currentResult} / {resultCount}
            </output>
        ) : (
            <label className={styles.indicator} htmlFor={inputId} aria-label="Focus search">
                <SearchIcon aria-hidden="true" />
            </label>
        );
        const controls = (
            <span className={styles.actions}>
                {hasQuery && onClear ? (
                    <>
                        <IconButton size="xs" shape="pill" aria-label="Clear search" onPress={onClear}>
                            <CloseIcon className={styles.clearIcon} aria-hidden="true" />
                        </IconButton>
                        <span className={styles.divider} data-search-divider="" aria-hidden="true" />
                    </>
                ) : null}
                {indicator}
                <IconButton shape="pill" aria-label="Previous search result" isDisabled={isNavigationDisabled} preventFocusOnPress onPress={onPreviousResult}>
                    <ChevronUpIcon aria-hidden="true" />
                </IconButton>
                <IconButton shape="pill" aria-label="Next search result" isDisabled={isNavigationDisabled} preventFocusOnPress onPress={onNextResult}>
                    <ChevronDownIcon aria-hidden="true" />
                </IconButton>
                {/* Search filters are intentionally hidden until the options menu has content. */}
            </span>
        );

        return (
            <div className={clsx(styles.control, className)} data-search-control="">
                <SearchInput
                    {...props}
                    ref={ref}
                    id={inputId}
                    className={styles.input}
                    size="toolbar"
                    value={value}
                    startAdornment={null}
                    endAdornment={controls}
                />
            </div>
        );
    },
);

SearchControl.displayName = 'SearchControl';

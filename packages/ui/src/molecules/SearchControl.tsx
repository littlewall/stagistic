import clsx from 'clsx';
import type {ReactElement, ReactNode} from 'react';
import {Dialog, DialogTrigger, Popover} from 'react-aria-components';

import {IconButton} from '../atoms/IconButton';
import {SearchInput, type SearchInputProps} from '../atoms/SearchInput';
import {ChevronDownIcon} from '../icons/ui/ChevronDownIcon';
import {ChevronUpIcon} from '../icons/ui/ChevronUpIcon';
import {CloseIcon} from '../icons/ui/CloseIcon';
import {SearchIcon} from '../icons/ui/SearchIcon';
import {SearchOptionsIcon} from '../icons/ui/SearchOptionsIcon';

import styles from './SearchControl.module.css';

export type SearchControlProps = {
    currentResult: number;
    resultCount: number;
    onPreviousResult?: () => void;
    onNextResult?: () => void;
    onClear?: () => void;
    children?: ReactNode;
} & Omit<SearchInputProps, 'startAdornment' | 'endAdornment' | 'children' | 'onClear'>;

export const SearchControl = ({
    currentResult,
    resultCount,
    onPreviousResult,
    onNextResult,
    onClear,
    children,
    className,
    value,
    ...props
}: SearchControlProps): ReactElement => {
    const hasQuery = typeof value === 'string' && value.length > 0;
    const isNavigationDisabled = !hasQuery || resultCount === 0;
    const indicator = hasQuery ? (
        <output className={styles.indicator} aria-label="Search result position">
            {currentResult} / {resultCount}
        </output>
    ) : (
        <span className={styles.indicator}>
            <SearchIcon aria-hidden="true" />
        </span>
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
            <IconButton shape="pill" aria-label="Previous search result" isDisabled={isNavigationDisabled} onPress={onPreviousResult}>
                <ChevronUpIcon aria-hidden="true" />
            </IconButton>
            <IconButton shape="pill" aria-label="Next search result" isDisabled={isNavigationDisabled} onPress={onNextResult}>
                <ChevronDownIcon aria-hidden="true" />
            </IconButton>
            <DialogTrigger>
                <IconButton shape="pill" aria-label="Search options">
                    <SearchOptionsIcon aria-hidden="true" />
                </IconButton>
                <Popover className={styles.optionsPopover} placement="bottom end" data-search-options-popover="">
                    <Dialog className={styles.optionsDialog} aria-label="Search options">
                        {children}
                    </Dialog>
                </Popover>
            </DialogTrigger>
        </span>
    );

    return (
        <div className={clsx(styles.control, className)} data-search-control="">
            <SearchInput {...props} className={styles.input} size="toolbar" value={value} startAdornment={null} endAdornment={controls} />
        </div>
    );
};

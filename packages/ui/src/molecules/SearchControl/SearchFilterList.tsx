import type {ReactNode} from 'react';
import {
    Button,
    ListBox,
    ListBoxItem,
    type Selection,
} from 'react-aria-components';

import {CheckIcon} from '../../icons/ui/CheckIcon';
import styles from './SearchControl.module.css';

export interface SearchControlFilterOption {
    value: string,
    label: string,
    icon?: ReactNode,
}

export interface SearchControlFilter {
    /** Heading of the filter panel, e.g. "Search in". */
    label: string,
    /** Summary shown while nothing is filtered. Defaults to "All". */
    allLabel?: string,
    options: readonly SearchControlFilterOption[],
    /** Selected option values; empty means no filter, everything is searched. */
    value: readonly string[],
    /** Receives the selection in option order; selecting every option reports an empty filter. */
    onChange: (value: string[]) => void,
}

/** A filter narrows the search only while some, but not all, options are selected. */
export const isSearchFilterActive = ({value, options}: SearchControlFilter) => value.length > 0 && options.some(option => !value.includes(option.value));
export const SearchFilterList = ({filter}: {filter: SearchControlFilter}) => {
    const {
        label,
        allLabel = 'All',
        options,
        value,
        onChange,
    } = filter;
    const isActive = isSearchFilterActive(filter);
    const onSelectionChange = (keys: Selection) => {
        const next = options
            .filter(option => keys === 'all' || keys.has(option.value))
            .map(option => option.value);

        onChange(next.length === options.length ? [] : next);
    };

    return (
        <>
            <div className={styles.filterHead}>
                <span className={styles.filterLabel}>
                    {label}
                    {' · '}
                    <span className={styles.filterSummary}>
                        {isActive ? `${value.length} of ${options.length}` : allLabel}
                    </span>
                </span>
                {isActive ? (
                    <Button
                        className={styles.filterReset}
                        onPress={() => onChange([])}
                    >
                        Reset
                    </Button>
                ) : null}
            </div>
            <ListBox
                aria-label={label}
                className={styles.filterList}
                selectionMode="multiple"
                // Escape closes the panel; by default a list would clear the filter first.
                escapeKeyBehavior="none"
                selectedKeys={isActive ? value : []}
                onSelectionChange={onSelectionChange}
                // Nothing selected searches everything: every row reads as included.
                data-all={isActive ? undefined : ''}
            >
                {options.map(option => (
                    <ListBoxItem
                        key={option.value}
                        id={option.value}
                        textValue={option.label}
                        className={styles.filterOption}
                    >
                        {option.icon ? <span className={styles.filterIcon} aria-hidden="true">{option.icon}</span> : null}
                        <span className={styles.filterOptionLabel}>{option.label}</span>
                        <CheckIcon
                            className={styles.filterCheck}
                            aria-hidden="true"
                        />
                    </ListBoxItem>
                ))}
            </ListBox>
        </>
    );
};

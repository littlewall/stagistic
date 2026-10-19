import clsx from 'clsx';
import {
    type FocusEvent as ReactFocusEvent,
    forwardRef,
    useId,
    useState,
} from 'react';

import {IconButton} from '../../atoms/IconButton/IconButton';
import {SearchInput, type SearchInputProps} from '../../atoms/SearchInput/SearchInput';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {ChevronDownIcon} from '../../icons/ui/ChevronDownIcon';
import {SearchActions} from './SearchActions';
import styles from './SearchControl.module.css';
import {
    isSearchFilterActive,
    type SearchControlFilter,
} from './SearchFilterList';
import {type SearchControlReplace, SearchReplaceRow} from './SearchReplaceRow';

export type {SearchControlFilter, SearchControlFilterOption} from './SearchFilterList';
export type {SearchControlReplace} from './SearchReplaceRow';

/** Platform-formatted shortcut labels shown in the button tooltips. */
export interface SearchControlShortcuts {
    previousResult?: string,
    nextResult?: string,
    toggleReplace?: string,
    replace?: string,
    replaceAll?: string,
}

export type SearchControlProps = {
    currentResult: number,
    resultCount: number,
    onPreviousResult?: () => void,
    onNextResult?: () => void,
    onClear?: () => void,
    /** The case and whole-word toggles render only with a change handler. */
    isCaseSensitive?: boolean,
    onCaseSensitiveChange?: (isCaseSensitive: boolean) => void,
    isWholeWord?: boolean,
    onWholeWordChange?: (isWholeWord: boolean) => void,
    /** Filter panel behind a funnel button; its dot marks an active filter. */
    filter?: SearchControlFilter,
    /** The expand chevron renders only when replace is supported. */
    replace?: SearchControlReplace,
    shortcuts?: SearchControlShortcuts,
} & Omit<SearchInputProps, 'startAdornment' | 'endAdornment' | 'children' | 'onClear'>;

export const SearchControl = forwardRef<HTMLInputElement, SearchControlProps>(
    ({
        currentResult,
        resultCount,
        onPreviousResult,
        onNextResult,
        onClear,
        isCaseSensitive = false,
        onCaseSensitiveChange,
        isWholeWord = false,
        onWholeWordChange,
        filter,
        replace,
        shortcuts = {},
        className,
        value,
        ...props
    }, ref) => {
        const generatedInputId = useId();
        const replaceRowId = useId();
        const inputId = props.id ?? generatedInputId;
        const isReplaceOpen = Boolean(replace?.isOpen);
        const [hasFocusWithin, setHasFocusWithin] = useState(false);
        const [isFilterOpen, setIsFilterOpen] = useState(false);
        const hasQuery = typeof value === 'string' && value.length > 0;
        /*
         * Focus or an open replace row activates search: the count and its options show before any typing.
         * The filter panel renders outside the surface, so its open state keeps search active too.
         */
        const isActive = hasQuery || hasFocusWithin || isReplaceOpen || isFilterOpen;
        const isFilterActive = Boolean(filter && isSearchFilterActive(filter));
        const isNavigationDisabled = !hasQuery || resultCount === 0;
        const onSurfaceBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setHasFocusWithin(false);
            }
        };

        return (
            <div
                className={clsx(styles.slot, className)}
                data-search-control=""
            >
                <div
                    className={styles.control}
                    data-expanded={isReplaceOpen || undefined}
                    data-search-surface=""
                    data-active={isActive || undefined}
                    onFocus={() => setHasFocusWithin(true)}
                    onBlur={onSurfaceBlur}
                >
                    {replace ? (
                        <Tooltip
                            label={isReplaceOpen ? 'Hide replace' : 'Show replace'}
                            shortcut={shortcuts.toggleReplace}
                            placement="left"
                        >
                            <IconButton
                                className={styles.toggle}
                                aria-label="Toggle replace"
                                aria-expanded={isReplaceOpen}
                                aria-controls={isReplaceOpen ? replaceRowId : undefined}
                                preventFocusOnPress
                                onPress={() => replace.onOpenChange(!isReplaceOpen)}
                            >
                                <ChevronDownIcon
                                    className={styles.toggleIcon}
                                    aria-hidden="true"
                                />
                            </IconButton>
                        </Tooltip>
                    ) : null}
                    <div className={styles.rows}>
                        <SearchInput
                            {...props}
                            ref={ref}
                            id={inputId}
                            className={styles.input}
                            size="toolbar"
                            value={value}
                            startAdornment={null}
                            endAdornment={(
                                <SearchActions
                                    isActive={isActive}
                                    hasQuery={hasQuery}
                                    inputId={inputId}
                                    currentResult={currentResult}
                                    resultCount={resultCount}
                                    onClear={onClear}
                                    isCaseSensitive={isCaseSensitive}
                                    onCaseSensitiveChange={onCaseSensitiveChange}
                                    isWholeWord={isWholeWord}
                                    onWholeWordChange={onWholeWordChange}
                                    filter={filter}
                                    isFilterActive={isFilterActive}
                                    isNavigationDisabled={isNavigationDisabled}
                                    onPreviousResult={onPreviousResult}
                                    onNextResult={onNextResult}
                                    shortcuts={shortcuts}
                                    onFilterOpenChange={setIsFilterOpen}
                                />
                            )}
                        />
                        {replace && isReplaceOpen ? (
                            <SearchReplaceRow
                                id={replaceRowId}
                                replace={replace}
                                shortcuts={shortcuts}
                                searchInputId={inputId}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        );
    },
);

SearchControl.displayName = 'SearchControl';

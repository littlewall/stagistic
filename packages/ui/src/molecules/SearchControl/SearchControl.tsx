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
import {CaseSensitiveIcon} from '../../icons/ui/CaseSensitiveIcon';
import {ChevronDownIcon} from '../../icons/ui/ChevronDownIcon';
import {ChevronUpIcon} from '../../icons/ui/ChevronUpIcon';
import {CloseIcon} from '../../icons/ui/CloseIcon';
import {FilterIcon} from '../../icons/ui/FilterIcon';
import {SearchIcon} from '../../icons/ui/SearchIcon';
import {WholeWordIcon} from '../../icons/ui/WholeWordIcon';
import {IconPopover} from '../IconPopover/IconPopover';
import styles from './SearchControl.module.css';
import {
    isSearchFilterActive,
    type SearchControlFilter,
    SearchFilterList,
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
        const hasClear = hasQuery && Boolean(onClear);
        const hasCaseToggle = isActive && Boolean(onCaseSensitiveChange);
        const hasWholeWordToggle = isActive && Boolean(onWholeWordChange);
        // An active filter stays visible at rest: it changes what every later search finds.
        const hasFilter = Boolean(filter) && (isActive || isFilterActive);
        const onSurfaceBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setHasFocusWithin(false);
            }
        };
        const indicator = isActive ? (
            <output
                className={styles.indicator}
                aria-label="Search result position"
                aria-live="polite"
                aria-atomic="true"
            >
                {currentResult} / {resultCount}
            </output>
        ) : (
            <label
                className={styles.indicator}
                htmlFor={inputId}
                aria-label="Focus search"
            >
                <SearchIcon aria-hidden="true" />
            </label>
        );
        const controls = (
            <span className={styles.actions}>
                {hasClear ? (
                    <Tooltip
                        label="Clear search"
                        placement="bottom"
                    >
                        <IconButton
                            size="xs"
                            shape="pill"
                            aria-label="Clear search"
                            onPress={onClear}
                        >
                            <CloseIcon
                                className={styles.clearIcon}
                                aria-hidden="true"
                            />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {hasCaseToggle && onCaseSensitiveChange ? (
                    <Tooltip
                        label="Match case"
                        placement="bottom"
                    >
                        <IconButton
                            size="xs"
                            aria-label="Match case"
                            aria-pressed={isCaseSensitive}
                            isSelected={isCaseSensitive}
                            preventFocusOnPress
                            onPress={() => onCaseSensitiveChange(!isCaseSensitive)}
                        >
                            <CaseSensitiveIcon aria-hidden="true" />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {hasWholeWordToggle && onWholeWordChange ? (
                    <Tooltip
                        label="Match whole word"
                        placement="bottom"
                    >
                        <IconButton
                            size="xs"
                            aria-label="Match whole word"
                            aria-pressed={isWholeWord}
                            isSelected={isWholeWord}
                            preventFocusOnPress
                            onPress={() => onWholeWordChange(!isWholeWord)}
                        >
                            <WholeWordIcon aria-hidden="true" />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {hasFilter && filter ? (
                    <IconPopover
                        aria-label={isFilterActive ? 'Search filter (active)' : 'Search filter'}
                        icon={<FilterIcon aria-hidden="true" />}
                        size="xs"
                        placement="bottom"
                        hasIndicator={isFilterActive}
                        className={styles.filterTrigger}
                        onOpenChange={setIsFilterOpen}
                    >
                        <SearchFilterList filter={filter} />
                    </IconPopover>
                ) : null}
                {hasClear || hasCaseToggle || hasWholeWordToggle || hasFilter ? (
                    <span
                        className={styles.divider}
                        data-search-divider=""
                        aria-hidden="true"
                    />
                ) : null}
                {indicator}
                <Tooltip
                    label="Previous result"
                    shortcut={shortcuts.previousResult}
                    placement="bottom"
                >
                    <IconButton
                        shape="pill"
                        aria-label="Previous search result"
                        isDisabled={isNavigationDisabled}
                        preventFocusOnPress
                        onPress={onPreviousResult}
                    >
                        <ChevronUpIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
                <Tooltip
                    label="Next result"
                    shortcut={shortcuts.nextResult}
                    placement="bottom"
                >
                    <IconButton
                        shape="pill"
                        aria-label="Next search result"
                        isDisabled={isNavigationDisabled}
                        preventFocusOnPress
                        onPress={onNextResult}
                    >
                        <ChevronDownIcon aria-hidden="true" />
                    </IconButton>
                </Tooltip>
            </span>
        );

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
                            endAdornment={controls}
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

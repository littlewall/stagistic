import {IconButton} from '../../atoms/IconButton/IconButton';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {CaseSensitiveIcon} from '../../icons/ui/CaseSensitiveIcon';
import {ChevronDownIcon} from '../../icons/ui/ChevronDownIcon';
import {ChevronUpIcon} from '../../icons/ui/ChevronUpIcon';
import {CloseIcon} from '../../icons/ui/CloseIcon';
import {FilterIcon} from '../../icons/ui/FilterIcon';
import {SearchIcon} from '../../icons/ui/SearchIcon';
import {WholeWordIcon} from '../../icons/ui/WholeWordIcon';
import {IconPopover} from '../IconPopover/IconPopover';
import type {SearchControlProps} from './SearchControl';
import styles from './SearchControl.module.css';
import {SearchFilterList} from './SearchFilterList';

interface SearchActionsProps extends Pick<SearchControlProps,
    'currentResult' | 'resultCount' | 'onClear' | 'isCaseSensitive' | 'onCaseSensitiveChange' |
    'isWholeWord' | 'onWholeWordChange' | 'filter' | 'onPreviousResult' | 'onNextResult'> {
    isActive: boolean,
    hasQuery: boolean,
    inputId: string,
    isFilterActive: boolean,
    isNavigationDisabled: boolean,
    shortcuts: NonNullable<SearchControlProps['shortcuts']>,
    onFilterOpenChange: (isOpen: boolean) => void,
}

export const SearchActions = ({
    isActive,
    hasQuery,
    inputId,
    currentResult,
    resultCount,
    onClear,
    isCaseSensitive,
    onCaseSensitiveChange,
    isWholeWord,
    onWholeWordChange,
    filter,
    isFilterActive,
    isNavigationDisabled,
    onPreviousResult,
    onNextResult,
    shortcuts,
    onFilterOpenChange,
}: SearchActionsProps) => {
    const hasClear = hasQuery && Boolean(onClear);
    const hasCaseToggle = isActive && Boolean(onCaseSensitiveChange);
    const hasWholeWordToggle = isActive && Boolean(onWholeWordChange);
    // An active filter stays visible at rest: it changes what every later search finds.
    const hasFilter = Boolean(filter) && (isActive || isFilterActive);
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

    return (
        <span className={styles.actions}>
            {hasClear ? (
                <Tooltip
                    label="Clear search"
                    placement="bottom"
                >
                    <IconButton
                        size="xs"
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
                    onOpenChange={onFilterOpenChange}
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
};

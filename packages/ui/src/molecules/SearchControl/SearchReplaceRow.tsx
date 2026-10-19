import {
    type ChangeEventHandler,
    type KeyboardEvent as ReactKeyboardEvent,
    type Ref,
} from 'react';

import {IconButton} from '../../atoms/IconButton/IconButton';
import {SearchInput} from '../../atoms/SearchInput/SearchInput';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {ReplaceAllIcon} from '../../icons/ui/ReplaceAllIcon';
import {ReplaceIcon} from '../../icons/ui/ReplaceIcon';
import styles from './SearchControl.module.css';

/** Replace row revealed by the leading chevron; Enter replaces the current result, Mod+Enter all. */
export interface SearchControlReplace {
    isOpen: boolean,
    onOpenChange: (isOpen: boolean) => void,
    value: string,
    onChange: ChangeEventHandler<HTMLInputElement>,
    onReplace: () => void,
    onReplaceAll: () => void,
    isDisabled?: boolean,
    inputRef?: Ref<HTMLInputElement>,
}

interface SearchReplaceRowProps {
    id: string,
    replace: SearchControlReplace,
    shortcuts: {replace?: string, replaceAll?: string},
    /** Escape collapses the row and returns focus here. */
    searchInputId: string,
}

/** Second row of `SearchControl`; shares its row styles. */
export const SearchReplaceRow = ({
    id,
    replace,
    shortcuts,
    searchInputId,
}: SearchReplaceRowProps) => {
    const {inputRef, ...replacement} = replace;
    const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            replacement.onOpenChange(false);
            document.getElementById(searchInputId)?.focus();

            return;
        }

        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        if (replacement.isDisabled) {
            return;
        }

        if (event.metaKey || event.ctrlKey) {
            replacement.onReplaceAll();
        } else {
            replacement.onReplace();
        }
    };

    return (
        <div
            id={id}
            className={styles.replaceRow}
            data-search-replace=""
        >
            <SearchInput
                ref={inputRef}
                className={styles.input}
                size="toolbar"
                value={replacement.value}
                aria-label="Replace with"
                placeholder="Replace with…"
                startAdornment={null}
                onChange={replacement.onChange}
                onKeyDown={onKeyDown}
                endAdornment={(
                    <span className={styles.actions}>
                        <Tooltip
                            label="Replace"
                            shortcut={shortcuts.replace}
                            placement="bottom"
                        >
                            <IconButton
                                aria-label="Replace"
                                isDisabled={replacement.isDisabled}
                                preventFocusOnPress
                                onPress={replacement.onReplace}
                            >
                                <ReplaceIcon aria-hidden="true" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            label="Replace all"
                            shortcut={shortcuts.replaceAll}
                            placement="bottom"
                        >
                            <IconButton
                                aria-label="Replace all"
                                isDisabled={replacement.isDisabled}
                                preventFocusOnPress
                                onPress={replacement.onReplaceAll}
                            >
                                <ReplaceAllIcon aria-hidden="true" />
                            </IconButton>
                        </Tooltip>
                    </span>
                )}
            />
        </div>
    );
};

import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
} from 'react';

import styles from '../CharacterSuggestionsOverlay.module.css';
import {getCharacterSuggestionOptionId} from './accessibility';
import type {SuggestionEntry} from './model';

type CharacterSuggestionsOverlayViewProps = {
    overlayRef: RefObject<HTMLDivElement | null>,
    listboxId: string,
    style: CSSProperties,
    suggestions: SuggestionEntry[],
    activeSuggestionIndex: number | null,
    onSuggestionMouseDown: (suggestion: string, event: ReactMouseEvent<HTMLButtonElement>) => void,
};

export const CharacterSuggestionsOverlayView = ({
    overlayRef,
    listboxId,
    style,
    suggestions,
    activeSuggestionIndex,
    onSuggestionMouseDown,
}: CharacterSuggestionsOverlayViewProps) => {
    return (
        <div
            className={styles.overlay}
            style={style}
            ref={overlayRef}
        >
            <div
                className={styles.panel}
                id={listboxId}
                role="listbox"
                aria-label="Character suggestions"
            >
                {suggestions.map((suggestion, index) => {
                    const isActive = activeSuggestionIndex !== null && activeSuggestionIndex === index;

                    return (
                        <button
                            key={suggestion.key}
                            id={getCharacterSuggestionOptionId(listboxId, index)}
                            className={clsx(styles.item, isActive && styles.active)}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseDown={event => onSuggestionMouseDown(suggestion.key, event)}
                        >
                            <span className={styles.itemDot} style={{backgroundColor: suggestion.color}} />
                            <span className={styles.itemLabel}>{suggestion.key}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
} from 'react';

import styles from '../CharacterSuggestionsOverlay.module.css';
import type {SuggestionEntry} from './model';

type CharacterSuggestionsOverlayViewProps = {
    overlayRef: RefObject<HTMLDivElement | null>,
    style: CSSProperties,
    suggestions: SuggestionEntry[],
    onSuggestionMouseDown: (suggestion: string, event: ReactMouseEvent<HTMLButtonElement>) => void,
};

export const CharacterSuggestionsOverlayView = ({
    overlayRef,
    style,
    suggestions,
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
                role="listbox"
                aria-label="Character suggestions"
            >
                {suggestions.map(suggestion => (
                    <button
                        key={suggestion.key}
                        className={styles.item}
                        type="button"
                        role="option"
                        onMouseDown={event => onSuggestionMouseDown(suggestion.key, event)}
                    >
                        <span className={styles.itemDot} style={{backgroundColor: suggestion.color}} />
                        <span className={styles.itemLabel}>{suggestion.key}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

import {MicrophoneIcon, MusicDoubleNoteIcon} from '@stagistic/ui';
import clsx from 'clsx';

import type {PersistentMusicRef} from '../contracts';
import type {MusicSuggestionsOverlayProps} from './musicSuggestions/musicSuggestionModel';
import {useMusicSuggestionsOverlay} from './musicSuggestions/useMusicSuggestionsOverlay';
import styles from './MusicSuggestionsOverlay.module.css';

const MusicKindIcon = ({kind}: {kind: PersistentMusicRef['kind']}) => {
    const Icon = kind === 'instrumental' ? MusicDoubleNoteIcon : MicrophoneIcon;

    return (
        <Icon
            className={styles.itemIcon}
            aria-hidden="true"
        />
    );
};

const MusicSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentMusic = [],
    onMusicAssigned,
}: MusicSuggestionsOverlayProps) => {
    const {
        overlayRef,
        overlayState,
        suggestions,
        activeSuggestionIndex,
        handleSuggestionMouseDown,
    } = useMusicSuggestionsOverlay({
        editor,
        canvasRef,
        persistentMusic,
        onMusicAssigned,
    });

    if (!editor || !overlayState || suggestions.length === 0) {
        return null;
    }

    return (
        <div
            className={styles.overlay}
            style={overlayState.style}
            ref={overlayRef}
        >
            <div
                className={styles.panel}
                role="listbox"
                aria-label="Music suggestions"
            >
                {suggestions.map((music, index) => {
                    const isActive = activeSuggestionIndex === index;

                    return (
                        <button
                            key={music.id}
                            className={clsx(styles.item, isActive && styles.active)}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseDown={event => handleSuggestionMouseDown(music, event)}
                        >
                            <MusicKindIcon kind={music.kind} />
                            <span className={styles.itemLabel}>{music.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MusicSuggestionsOverlay;

import {
    MicrophoneIcon,
    MusicDoubleNoteIcon,
} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {PersistentMusicRef} from '../contracts';
import {useExclusiveOverlay} from '../hooks/useExclusiveOverlay';
import {getMusicComposeFromState} from '../tiptap/extensions';
import {buildCommitMusic} from '../tiptap/extensions/musicInput/transactions';
import {getActiveScriptBlockFromState} from '../tiptap/scriptCore';
import {computeOverlayStyle} from './characterSuggestions/model/overlayPosition';
import styles from './MusicSuggestionsOverlay.module.css';

type MusicSuggestionOverlayState = {
    style: CSSProperties,
    suggestions: PersistentMusicRef[],
};

type MusicSuggestionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentMusic?: readonly PersistentMusicRef[],
    onMusicAssigned?: (musicId: string) => void,
};

const normalizeMusicTitle = (value: string) => {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
};

export const getMusicSuggestions = (
    music: readonly PersistentMusicRef[],
    query: string,
) => {
    const normalizedQuery = normalizeMusicTitle(query);

    return music
        .filter(music => !music.assignmentLabel)
        .map(music => ({
            music,
            normalizedTitle: normalizeMusicTitle(music.title),
        }))
        .filter(entry => {
            return !normalizedQuery || entry.normalizedTitle.includes(normalizedQuery);
        })
        .sort((a, b) => {
            if (!normalizedQuery) {
                return a.music.title.localeCompare(b.music.title);
            }

            const aStarts = a.normalizedTitle.startsWith(normalizedQuery);
            const bStarts = b.normalizedTitle.startsWith(normalizedQuery);

            if (aStarts !== bStarts) {
                return aStarts ? -1 : 1;
            }

            return a.music.title.localeCompare(b.music.title);
        })
        .map(entry => entry.music);
};

const getSafeIsFocused = (editor: TiptapEditor) => {
    if (editor.isFocused) {
        return true;
    }

    try {
        return editor.view.hasFocus();
    } catch {
        return false;
    }
};

const MusicKindIcon = ({kind}: {kind: PersistentMusicRef['kind']}) => {
    const Icon = kind === 'instrumental' ? MusicDoubleNoteIcon : MicrophoneIcon;

    return <Icon className={styles.itemIcon} aria-hidden="true" />;
};

const MusicSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentMusic = [],
    onMusicAssigned,
}: MusicSuggestionsOverlayProps) => {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const [overlayState, setOverlayState] = useState<MusicSuggestionOverlayState | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const suggestions = overlayState?.suggestions ?? [];
    const closeOverlay = useCallback(() => {
        setOverlayState(null);
        setActiveSuggestionIndex(null);
    }, []);
    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas || persistentMusic.length === 0) {
            closeOverlay();

            return;
        }

        const compose = getMusicComposeFromState(editor.state);

        if (!compose) {
            closeOverlay();

            return;
        }

        if (!getSafeIsFocused(editor)) {
            closeOverlay();

            return;
        }

        const block = getActiveScriptBlockFromState(editor.state);

        if (!block) {
            closeOverlay();

            return;
        }

        const nextSuggestions = getMusicSuggestions(persistentMusic, compose.query);
        const style = computeOverlayStyle({
            editor,
            canvas,
            blockFrom: block.from,
            blockTo: block.to,
            valueStart: compose.from - block.from,
            valueEnd: compose.to - block.from,
            overlayWidthPx: 220,
            horizontalPaddingPx: 8,
        });

        if (!style || nextSuggestions.length === 0) {
            closeOverlay();

            return;
        }

        setOverlayState({
            style,
            suggestions: nextSuggestions,
        });
    }, [
        canvasRef,
        closeOverlay,
        editor,
        persistentMusic,
    ]);
    const cancelScheduledOverlayUpdate = useCallback(() => {
        if (rafIdRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
    }, []);
    const scheduleOverlayUpdate = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            updateOverlay();
        });
    }, [updateOverlay]);
    const selectMusic = useCallback((music: PersistentMusicRef) => {
        if (!editor) {
            return;
        }

        const compose = getMusicComposeFromState(editor.state);

        if (!compose) {
            return;
        }

        editor.view.dispatch(buildCommitMusic(editor.state, compose, {
            musicId: music.id,
            kind: music.kind,
            title: music.title,
        }));
        onMusicAssigned?.(music.id);
        closeOverlay();
    }, [
        closeOverlay,
        editor,
        onMusicAssigned,
    ]);
    const handleSuggestionMouseDown = useCallback((
        music: PersistentMusicRef,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        selectMusic(music);
    }, [selectMusic]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleTransaction = () => {
            if (getMusicComposeFromState(editor.state)) {
                scheduleOverlayUpdate();

                return;
            }

            closeOverlay();
        };
        const handleFocus = () => {
            if (getMusicComposeFromState(editor.state)) {
                scheduleOverlayUpdate();
            }
        };
        const handleBlur = () => {
            cancelScheduledOverlayUpdate();
            closeOverlay();
        };

        editor.on('transaction', handleTransaction);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
        };
    }, [
        cancelScheduledOverlayUpdate,
        closeOverlay,
        editor,
        scheduleOverlayUpdate,
    ]);

    useEffect(() => {
        return () => {
            cancelScheduledOverlayUpdate();
        };
    }, [cancelScheduledOverlayUpdate]);

    useEffect(() => {
        if (suggestions.length === 0) {
            setActiveSuggestionIndex(null);

            return;
        }

        setActiveSuggestionIndex(previous => {
            if (previous === null) {
                return null;
            }

            return Math.min(previous, suggestions.length - 1);
        });
    }, [suggestions.length]);

    useEffect(() => {
        if (!overlayState || suggestions.length === 0) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!editor || !getSafeIsFocused(editor)) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                setActiveSuggestionIndex(previous => {
                    return previous === null ? 0 : (previous + 1) % suggestions.length;
                });

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                setActiveSuggestionIndex(previous => {
                    return previous === null
                        ? suggestions.length - 1
                        : (previous + suggestions.length - 1) % suggestions.length;
                });

                return;
            }

            if (event.key !== 'Enter' || activeSuggestionIndex === null) {
                return;
            }

            const activeSuggestion = suggestions[activeSuggestionIndex];

            if (!activeSuggestion) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            selectMusic(activeSuggestion);
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [
        activeSuggestionIndex,
        editor,
        overlayState,
        selectMusic,
        suggestions,
    ]);

    useEffect(() => {
        const handleResize = () => {
            if (overlayState) {
                scheduleOverlayUpdate();
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [overlayState, scheduleOverlayUpdate]);

    useExclusiveOverlay(overlayState !== null, closeOverlay);

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

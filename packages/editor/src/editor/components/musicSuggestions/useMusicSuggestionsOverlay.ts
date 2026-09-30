import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {PersistentMusicRef} from '../../contracts';
import {useExclusiveOverlay} from '../../hooks/useExclusiveOverlay';
import {getMusicComposeFromState} from '../../tiptap/extensions';
import {buildCommitMusic} from '../../tiptap/extensions/musicInput/transactions';
import {getActiveScriptBlockFromState} from '../../tiptap/scriptCore';
import {computeOverlayStyle} from '../characterSuggestions/model/overlayPosition';
import {
    getMusicSuggestions,
    getSafeIsFocused,
    type MusicSuggestionOverlayState,
    type MusicSuggestionsOverlayProps,
} from './musicSuggestionModel';

export const useMusicSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentMusic,
    onMusicAssigned,
}: Required<Pick<MusicSuggestionsOverlayProps, 'persistentMusic'>> & MusicSuggestionsOverlayProps) => {
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
    const selectMusic = useCallback(
        (music: PersistentMusicRef) => {
            if (!editor) {
                return;
            }

            const compose = getMusicComposeFromState(editor.state);

            if (!compose) {
                return;
            }

            editor.view.dispatch(
                buildCommitMusic(editor.state, compose, {
                    musicId: music.id,
                    kind: music.kind,
                    title: music.title,
                }),
            );
            onMusicAssigned?.(music.id);
            closeOverlay();
        },
        [
            closeOverlay,
            editor,
            onMusicAssigned,
        ],
    );
    const handleSuggestionMouseDown = useCallback(
        (music: PersistentMusicRef, event: ReactMouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            event.stopPropagation();
            selectMusic(music);
        },
        [selectMusic],
    );

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
                    return previous === null ? suggestions.length - 1 : (previous + suggestions.length - 1) % suggestions.length;
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

    return {
        overlayRef,
        overlayState,
        suggestions,
        activeSuggestionIndex,
        handleSuggestionMouseDown,
    };
};

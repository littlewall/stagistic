import {
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {PersistentMusicRef} from '../../contracts';
import {useAnimationFrameUpdate} from '../../hooks/useAnimationFrameUpdate';
import {useExclusiveOverlay} from '../../hooks/useExclusiveOverlay';
import {getMusicComposeFromState} from '../../tiptap/extensions';
import {buildCommitMusic} from '../../tiptap/extensions/musicInput/transactions';
import {getActiveScriptBlockFromState} from '../../tiptap/scriptCore';
import {computeOverlayStyle} from '../characterSuggestions/model/overlayPosition';
import {handleSuggestionKeyDown} from '../suggestionKeyboardNavigation';
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
    const [overlayState, setOverlayState] = useState<MusicSuggestionOverlayState | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const suggestions = useMemo(() => overlayState?.suggestions ?? [], [overlayState]);
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
    const {cancel: cancelScheduledOverlayUpdate, schedule: scheduleOverlayUpdate} = useAnimationFrameUpdate(updateOverlay);
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

    const boundedActiveIndex = activeSuggestionIndex === null || suggestions.length === 0
        ? null
        : Math.min(activeSuggestionIndex, suggestions.length - 1);

    if (activeSuggestionIndex !== boundedActiveIndex) {
        setActiveSuggestionIndex(boundedActiveIndex);
    }

    useEffect(() => {
        if (!overlayState || suggestions.length === 0) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!editor || !getSafeIsFocused(editor)) {
                return;
            }

            handleSuggestionKeyDown({
                event,
                suggestions,
                activeSuggestionIndex,
                setActiveSuggestionIndex,
                onSelect: selectMusic,
            });
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

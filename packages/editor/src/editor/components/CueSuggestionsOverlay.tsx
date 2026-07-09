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

import {useExclusiveOverlay} from '../hooks/useExclusiveOverlay';
import type {PersistentCueRef} from '../contracts';
import {getCueComposeFromState} from '../tiptap/extensions';
import {buildCommitCue} from '../tiptap/extensions/cueInput/transactions';
import {getActiveScriptBlockFromState} from '../tiptap/scriptCore';
import {computeOverlayStyle} from './characterSuggestions/model/overlayPosition';
import styles from './CueSuggestionsOverlay.module.css';

type CueSuggestionOverlayState = {
    style: CSSProperties,
    suggestions: PersistentCueRef[],
};

type CueSuggestionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentCues?: readonly PersistentCueRef[],
    onCueAssigned?: (cueId: string) => void,
};

const normalizeCueTitle = (value: string) => {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
};

const getCueSuggestions = (
    cues: readonly PersistentCueRef[],
    query: string,
) => {
    const normalizedQuery = normalizeCueTitle(query);

    return cues
        .filter(cue => !cue.assignmentLabel)
        .map(cue => ({
            cue,
            normalizedTitle: normalizeCueTitle(cue.title),
        }))
        .filter(entry => {
            return !normalizedQuery || entry.normalizedTitle.includes(normalizedQuery);
        })
        .sort((a, b) => {
            if (!normalizedQuery) {
                return a.cue.title.localeCompare(b.cue.title);
            }

            const aStarts = a.normalizedTitle.startsWith(normalizedQuery);
            const bStarts = b.normalizedTitle.startsWith(normalizedQuery);

            if (aStarts !== bStarts) {
                return aStarts ? -1 : 1;
            }

            return a.cue.title.localeCompare(b.cue.title);
        })
        .slice(0, 8)
        .map(entry => entry.cue);
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

const CueKindIcon = ({kind}: {kind: PersistentCueRef['kind']}) => {
    const Icon = kind === 'instrumental' ? MusicDoubleNoteIcon : MicrophoneIcon;

    return <Icon className={styles.itemIcon} aria-hidden="true" />;
};

const CueSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentCues = [],
    onCueAssigned,
}: CueSuggestionsOverlayProps) => {
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const [overlayState, setOverlayState] = useState<CueSuggestionOverlayState | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const suggestions = overlayState?.suggestions ?? [];
    const closeOverlay = useCallback(() => {
        setOverlayState(null);
        setActiveSuggestionIndex(null);
    }, []);
    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas || persistentCues.length === 0) {
            closeOverlay();

            return;
        }

        const compose = getCueComposeFromState(editor.state);

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

        const nextSuggestions = getCueSuggestions(persistentCues, compose.query);
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
        persistentCues,
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
    const selectCue = useCallback((cue: PersistentCueRef) => {
        if (!editor) {
            return;
        }

        const compose = getCueComposeFromState(editor.state);

        if (!compose) {
            return;
        }

        editor.view.dispatch(buildCommitCue(editor.state, compose, {
            cueId: cue.id,
            kind: cue.kind,
            title: cue.title,
        }));
        onCueAssigned?.(cue.id);
        closeOverlay();
    }, [
        closeOverlay,
        editor,
        onCueAssigned,
    ]);
    const handleSuggestionMouseDown = useCallback((
        cue: PersistentCueRef,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        selectCue(cue);
    }, [selectCue]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleTransaction = () => {
            if (getCueComposeFromState(editor.state)) {
                scheduleOverlayUpdate();

                return;
            }

            closeOverlay();
        };
        const handleFocus = () => {
            if (getCueComposeFromState(editor.state)) {
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
                setActiveSuggestionIndex(previous => previous === null
                    ? 0
                    : (previous + 1) % suggestions.length);

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                setActiveSuggestionIndex(previous => previous === null
                    ? suggestions.length - 1
                    : (previous + suggestions.length - 1) % suggestions.length);

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
            selectCue(activeSuggestion);
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [
        activeSuggestionIndex,
        editor,
        overlayState,
        selectCue,
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
    }, [
        overlayState,
        scheduleOverlayUpdate,
    ]);

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
                aria-label="Cue suggestions"
            >
                {suggestions.map((cue, index) => {
                    const isActive = activeSuggestionIndex === index;

                    return (
                        <button
                            key={cue.id}
                            className={clsx(styles.item, isActive && styles.active)}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseDown={event => handleSuggestionMouseDown(cue, event)}
                        >
                            <CueKindIcon kind={cue.kind} />
                            <span className={styles.itemLabel}>{cue.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CueSuggestionsOverlay;

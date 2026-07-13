import {
    CUE_DRAFT_ATTR,
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
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
    useState,
} from 'react';

import type {PersistentCueRef} from '../contracts';
import {useExclusiveOverlay} from '../hooks/useExclusiveOverlay';
import {getCueSuggestions} from './CueSuggestionsOverlay';
import styles from './CueSuggestionsOverlay.module.css';

interface CueDraftSuggestionsOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentCues?: readonly PersistentCueRef[],
    onCueAssigned?: (cueId: string) => void,
}

interface DraftTarget {
    draftCueId: string,
    input: HTMLInputElement,
    query: string,
}
interface OverlayState {
    style: CSSProperties,
    target: DraftTarget,
    suggestions: PersistentCueRef[],
}

const getDraftTarget = (): DraftTarget | null => {
    const input = document.activeElement;

    if (!(input instanceof HTMLInputElement) || input.dataset.cueDraft !== 'true') {
        return null;
    }

    const draftCueId = input.dataset.cueId;

    return draftCueId ? {
        draftCueId, input, query: input.value,
    } : null;
};

const getOverlayStyle = (
    canvas: HTMLElement,
    input: HTMLInputElement,
): CSSProperties => {
    const canvasRect = canvas.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const left = inputRect.left - canvasRect.left + canvas.scrollLeft;
    const maxLeft = Math.max(8, canvas.clientWidth - 236);

    return {
        left: Math.min(Math.max(8, left), maxLeft),
        top: inputRect.bottom - canvasRect.top + canvas.scrollTop + 8,
    };
};

const assignDraftCue = (
    editor: TiptapEditor,
    draftCueId: string,
    cue: PersistentCueRef,
) => {
    let draftPosition: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (node.type.name === CUE_START_NODE_NAME && node.attrs[CUE_ID_ATTR] === draftCueId) {
            draftPosition = pos;

            return false;
        }

        return true;
    });

    if (draftPosition === null) {
        return false;
    }

    const node = editor.state.doc.nodeAt(draftPosition);

    if (!node) {
        return false;
    }

    editor.view.dispatch(editor.state.tr.setNodeMarkup(draftPosition, undefined, {
        ...node.attrs,
        [CUE_ID_ATTR]: cue.id,
        [CUE_TITLE_ATTR]: cue.title,
        [CUE_KIND_ATTR]: cue.kind,
        [CUE_DRAFT_ATTR]: false,
    }));

    return true;
};

const CueDraftSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentCues = [],
    onCueAssigned,
}: CueDraftSuggestionsOverlayProps) => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const suggestions = overlayState?.suggestions ?? [];
    const closeOverlay = useCallback(() => {
        setOverlayState(null);
        setActiveSuggestionIndex(null);
    }, []);
    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;
        const target = getDraftTarget();

        if (!editor || !canvas || !target) {
            closeOverlay();

            return;
        }

        const nextSuggestions = getCueSuggestions(persistentCues, target.query);

        if (nextSuggestions.length === 0) {
            closeOverlay();

            return;
        }

        setOverlayState({
            style: getOverlayStyle(canvas, target.input),
            target,
            suggestions: nextSuggestions,
        });
    }, [
        canvasRef,
        closeOverlay,
        editor,
        persistentCues,
    ]);
    const selectCue = useCallback((cue: PersistentCueRef) => {
        if (!editor || !overlayState) {
            return;
        }

        if (assignDraftCue(editor, overlayState.target.draftCueId, cue)) {
            onCueAssigned?.(cue.id);
        }

        closeOverlay();
    }, [
        closeOverlay,
        editor,
        onCueAssigned,
        overlayState,
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
            return undefined;
        }

        const scheduleUpdate = () => window.requestAnimationFrame(updateOverlay);
        const handleFocusIn = () => scheduleUpdate();
        const handleFocusOut = () => window.requestAnimationFrame(updateOverlay);

        editor.on('transaction', updateOverlay);
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        window.addEventListener('resize', updateOverlay);

        return () => {
            editor.off('transaction', updateOverlay);
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            window.removeEventListener('resize', updateOverlay);
        };
    }, [editor, updateOverlay]);

    useEffect(() => {
        if (!overlayState || suggestions.length === 0) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
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
            selectCue(activeSuggestion);
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [
        activeSuggestionIndex,
        overlayState,
        selectCue,
        suggestions,
    ]);

    useEffect(() => {
        setActiveSuggestionIndex(previous => {
            if (previous === null) {
                return null;
            }

            return Math.min(previous, suggestions.length - 1);
        });
    }, [suggestions]);

    useExclusiveOverlay(overlayState !== null, closeOverlay);
    if (!overlayState || suggestions.length === 0) {
        return null;
    }

    return (
        <div className={styles.overlay} style={overlayState.style}>
            <div
                className={styles.panel}
                role="listbox"
                aria-label="Cue suggestions"
            >
                {suggestions.map((cue, index) => {
                    const isActive = activeSuggestionIndex === index;
                    const Icon = cue.kind === 'instrumental' ? MusicDoubleNoteIcon : MicrophoneIcon;

                    return (
                        <button
                            key={cue.id}
                            className={clsx(styles.item, isActive && styles.active)}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseDown={event => handleSuggestionMouseDown(cue, event)}
                        >
                            <Icon className={styles.itemIcon} aria-hidden="true" />
                            <span className={styles.itemLabel}>{cue.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CueDraftSuggestionsOverlay;

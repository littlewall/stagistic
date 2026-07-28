import {
    MUSIC_DRAFT_ATTR,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
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

import type {PersistentMusicRef} from '../contracts';
import {useExclusiveOverlay} from '../hooks/useExclusiveOverlay';
import {getMusicSuggestions} from './MusicSuggestionsOverlay';
import styles from './MusicSuggestionsOverlay.module.css';

interface MusicDraftSuggestionsOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentMusic?: readonly PersistentMusicRef[],
    onMusicAssigned?: (musicId: string) => void,
}

interface DraftTarget {
    draftMusicId: string,
    editable: HTMLElement,
    query: string,
}
interface OverlayState {
    style: CSSProperties,
    target: DraftTarget,
    suggestions: PersistentMusicRef[],
}

const getDraftTarget = (): DraftTarget | null => {
    const editable = document.activeElement;

    if (!(editable instanceof HTMLElement) || editable.dataset.musicDraft !== 'true') {
        return null;
    }

    const draftMusicId = editable.dataset.musicId;

    return draftMusicId ? {
        draftMusicId, editable, query: editable.textContent ?? '',
    } : null;
};

const getOverlayStyle = (
    canvas: HTMLElement,
    editable: HTMLElement,
): CSSProperties => {
    const canvasRect = canvas.getBoundingClientRect();
    const editableRect = editable.getBoundingClientRect();
    const left = editableRect.left - canvasRect.left + canvas.scrollLeft;
    const maxLeft = Math.max(8, canvas.clientWidth - 236);

    return {
        left: Math.min(Math.max(8, left), maxLeft),
        top: editableRect.bottom - canvasRect.top + canvas.scrollTop + 8,
    };
};

const assignDraftMusic = (
    editor: TiptapEditor,
    draftMusicId: string,
    music: PersistentMusicRef,
) => {
    let draftPosition: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (node.type.name === MUSIC_START_NODE_NAME && node.attrs[MUSIC_ID_ATTR] === draftMusicId) {
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
        [MUSIC_ID_ATTR]: music.id,
        [MUSIC_TITLE_ATTR]: music.title,
        [MUSIC_KIND_ATTR]: music.kind,
        [MUSIC_DRAFT_ATTR]: false,
    }));

    return true;
};

const MusicDraftSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentMusic = [],
    onMusicAssigned,
}: MusicDraftSuggestionsOverlayProps) => {
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

        const nextSuggestions = getMusicSuggestions(persistentMusic, target.query);

        if (nextSuggestions.length === 0) {
            closeOverlay();

            return;
        }

        setOverlayState({
            style: getOverlayStyle(canvas, target.editable),
            target,
            suggestions: nextSuggestions,
        });
    }, [
        canvasRef,
        closeOverlay,
        editor,
        persistentMusic,
    ]);
    const selectMusic = useCallback((music: PersistentMusicRef) => {
        if (!editor || !overlayState) {
            return;
        }

        if (assignDraftMusic(editor, overlayState.target.draftMusicId, music)) {
            onMusicAssigned?.(music.id);
        }

        closeOverlay();
    }, [
        closeOverlay,
        editor,
        onMusicAssigned,
        overlayState,
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
            selectMusic(activeSuggestion);
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [
        activeSuggestionIndex,
        overlayState,
        selectMusic,
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
                aria-label="Music suggestions"
            >
                {suggestions.map((music, index) => {
                    const isActive = activeSuggestionIndex === index;
                    const Icon = music.kind === 'instrumental' ? MusicDoubleNoteIcon : MicrophoneIcon;

                    return (
                        <button
                            key={music.id}
                            className={clsx(styles.item, isActive && styles.active)}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseDown={event => handleSuggestionMouseDown(music, event)}
                        >
                            <Icon className={styles.itemIcon} aria-hidden="true" />
                            <span className={styles.itemLabel}>{music.title}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MusicDraftSuggestionsOverlay;

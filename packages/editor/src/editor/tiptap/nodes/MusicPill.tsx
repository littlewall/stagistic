import {
    MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import {ArrowRightIcon, EditPencilIcon} from '@stagistic/ui';
import {type NodeViewProps, NodeViewWrapper} from '@tiptap/react';
import clsx from 'clsx';
import {
    type FocusEvent,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react';

import type {
    EditorMusicCreateRequest,
    EditorMusicRemoveRequest,
    PersistentMusicRef,
} from '../../contracts';
import styles from './MusicPill.module.css';
import {
    MusicMenuButton,
    MusicUnassignIcon,
} from './MusicPillControls';
import {requestMusicPillCreation} from './musicPillCreation';
import {
    findMusicPillElement,
    getMusicStartPillData,
    handleBlurWithin,
    handleFocusWithin,
    scrollToMusicPill,
    usePillActivation,
} from './musicPillHelpers';
import {MusicPillMenuPopover} from './MusicPillMenuPopover';

interface MusicStartPillProps extends NodeViewProps {
    locked?: boolean,
    numberLabel?: string,
    onMusicAssigned?: (musicId: string) => void,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
    persistentMusicRef?: {current: readonly PersistentMusicRef[]},
}

export const MusicStartPill = ({
    node,
    updateAttributes,
    deleteNode,
    decorations,
    editor,
    getPos,
    locked = false,
    numberLabel,
    onMusicAssigned,
    onOpenMusicManager,
    onRequestCreateMusic,
    onRequestRemoveMusic,
    persistentMusicRef,
}: MusicStartPillProps) => {
    const {
        active,
        setActive,
        rootRef,
    } = usePillActivation();
    const anchorName = `--music-pill-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, '')}`;
    const titleRef = useRef<HTMLSpanElement>(null);
    const {
        mode,
        isDraft,
        musicId,
        title,
        musicNumber,
    } = getMusicStartPillData(node, decorations, numberLabel);
    const [draftTitle, setDraftTitle] = useState(title);
    const [previousTitle, setPreviousTitle] = useState(title);

    if (previousTitle !== title) {
        setPreviousTitle(title);
        setDraftTitle(title);
    }

    const hasEndMusic = Boolean(musicId && findMusicPillElement(editor, 'out', musicId));

    useEffect(() => {
        if (titleRef.current && titleRef.current.textContent !== title) {
            titleRef.current.textContent = title;
        }
    }, [title]);

    const commitTitle = (value = titleRef.current?.textContent ?? draftTitle) => {
        const next = value.trim();

        if (next === title) {
            return;
        }

        setDraftTitle(next);
        updateAttributes({[MUSIC_TITLE_ATTR]: next});
    };

    const updateTitle = (value: string) => {
        setDraftTitle(value);
        updateAttributes({[MUSIC_TITLE_ATTR]: value});
    };

    const unassignMusic = () => {
        if (musicId && onRequestRemoveMusic) {
            onRequestRemoveMusic({
                musicId,
                title,
                complete: () => editor.commands.unassignMusic(musicId),
            });

            return;
        }

        const pos = getPos();

        if (typeof pos !== 'number' || !editor.commands.deleteMusicStart(pos)) {
            deleteNode();
        }
    };
    const openMusicManager = () => {
        if (!musicId) {
            return;
        }

        setActive(false);
        onOpenMusicManager?.(musicId);
    };
    const goToEndMusic = () => {
        setActive(false);
        scrollToMusicPill(editor, 'out', musicId);
    };
    const requestMusicCreation = (value = titleRef.current?.textContent ?? draftTitle) => requestMusicPillCreation({
        title: value,
        isDraft,
        musicId,
        editor,
        getPos,
        updateAttributes,
        persistentMusicRef,
        onMusicAssigned,
        onRequestCreateMusic,
    });

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles[mode], active && !locked && styles.active)}
            data-music-pill="start"
            data-music-id={musicId || undefined}
            data-music-active={active ? 'true' : undefined}
            style={{'--music-pill-anchor': anchorName}}
            contentEditable={false}
            onFocus={locked ? undefined : handleFocusWithin(setActive)}
            onBlur={locked ? undefined : (event: FocusEvent<HTMLSpanElement>) => handleBlurWithin(rootRef, setActive)(event)}
        >
            {' '}
            <span
                className={styles.tagBody}
                role="presentation"
                onMouseDown={event => {
                    if (event.target !== titleRef.current) {
                        event.preventDefault();
                        titleRef.current?.focus();
                    }
                }}
            >
                <span
                    className={styles.number}
                    data-music-number
                    aria-hidden
                >
                    {musicNumber}
                </span>
                {draftTitle.length > 0 || active ? '\u00A0' : null}
                <span
                    ref={titleRef}
                    className={styles.titleInput}
                    data-music-title-input="start"
                    data-music-draft={isDraft ? 'true' : undefined}
                    data-music-id={musicId}
                    data-placeholder={active ? 'music' : undefined}
                    role="textbox"
                    aria-label="Music title"
                    aria-multiline="false"
                    contentEditable
                    tabIndex={locked ? 0 : -1}
                    suppressContentEditableWarning
                    spellCheck={false}
                    onInput={event => updateTitle(event.currentTarget.textContent ?? '')}
                    onBlur={event => {
                        const value = event.currentTarget.textContent ?? '';

                        if (isDraft && !value.trim()) {
                            deleteNode();

                            return;
                        }

                        commitTitle(value);

                        if (isDraft) {
                            requestMusicCreation(value);
                        }
                    }}
                    onKeyDown={event => {
                        event.stopPropagation();

                        if (event.key === 'Enter') {
                            const currentTitle = event.currentTarget.textContent ?? '';

                            event.preventDefault();
                            commitTitle(currentTitle);
                            event.currentTarget.blur();
                        }

                        if (event.key === 'Escape') {
                            if (isDraft) {
                                event.preventDefault();
                                deleteNode();

                                return;
                            }

                            setDraftTitle(title);
                            event.currentTarget.textContent = title;
                            updateAttributes({[MUSIC_TITLE_ATTR]: title});
                            event.currentTarget.blur();
                        }

                        if (event.key === 'Backspace' && isDraft && !(event.currentTarget.textContent ?? '')) {
                            event.preventDefault();
                            deleteNode();
                        }
                    }}
                />
            </span>
            {active && !locked ? (
                <MusicPillMenuPopover
                    isOpen
                    onOpenChange={setActive}
                >
                    {hasEndMusic ? (
                        <MusicMenuButton
                            label="Go to music end"
                            onClick={goToEndMusic}
                        >
                            <ArrowRightIcon aria-hidden="true" />
                        </MusicMenuButton>
                    ) : null}
                    {musicId && onOpenMusicManager ? (
                        <MusicMenuButton
                            label="Manage music"
                            onClick={openMusicManager}
                        >
                            <EditPencilIcon aria-hidden="true" />
                        </MusicMenuButton>
                    ) : null}
                    <MusicMenuButton
                        label="Unassign music"
                        onClick={unassignMusic}
                    >
                        <MusicUnassignIcon />
                    </MusicMenuButton>
                </MusicPillMenuPopover>
            ) : null}{' '}
        </NodeViewWrapper>
    );
};

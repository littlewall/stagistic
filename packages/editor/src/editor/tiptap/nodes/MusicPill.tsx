import {
    MUSIC_DRAFT_ATTR,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_TITLE_ATTR,
} from '@stagistic/script';
import {
    ArrowRightIcon,
    EditPencilIcon,
} from '@stagistic/ui';
import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';
import clsx from 'clsx';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    EditorMusicCreateRequest,
    EditorMusicRemoveRequest,
} from '../../contracts';
import styles from './MusicPill.module.css';
import {
    MusicDeleteIcon,
    MusicMenuButton,
    type MusicMode,
} from './MusicPillControls';
import {
    findMusicPillElement,
    handleBlurWithin,
    handleFocusWithin,
    normalizeMusicTitle,
    readDecorationLabel,
    scrollToMusicPill,
    usePillActivation,
} from './musicPillHelpers';

interface MusicStartPillProps extends NodeViewProps {
    onMusicAssigned?: (musicId: string) => void,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
}

export const MusicStartPill = ({
    node,
    updateAttributes,
    deleteNode,
    decorations,
    editor,
    getPos,
    onMusicAssigned,
    onOpenMusicManager,
    onRequestCreateMusic,
    onRequestRemoveMusic,
}: MusicStartPillProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const titleRef = useRef<HTMLSpanElement>(null);
    const mode: MusicMode = node.attrs[MUSIC_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const isDraft = node.attrs[MUSIC_DRAFT_ATTR] === true;
    const musicId = String(node.attrs[MUSIC_ID_ATTR] ?? '');
    const title = normalizeMusicTitle(node.attrs[MUSIC_TITLE_ATTR]);
    const musicNumber = readDecorationLabel(decorations, 'musicNumber');
    const [draftTitle, setDraftTitle] = useState(title);
    const hasEndMusic = Boolean(musicId && findMusicPillElement(editor, 'out', musicId));

    useEffect(() => {
        setDraftTitle(title);

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

    const deleteMusic = () => {
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
    const requestMusicCreation = (value = titleRef.current?.textContent ?? draftTitle) => {
        const nextTitle = value.trim();
        const pos = getPos();

        if (!nextTitle || !isDraft || !onRequestCreateMusic || typeof pos !== 'number') {
            return;
        }

        const candidateBlockId: unknown = editor.state.doc.resolve(pos).parent.attrs.id;

        if (typeof candidateBlockId !== 'string' || !candidateBlockId) {
            return;
        }

        onRequestCreateMusic({
            title: nextTitle,
            blockId: candidateBlockId,
            complete: music => {
                updateAttributes({
                    [MUSIC_ID_ATTR]: music.id,
                    [MUSIC_TITLE_ATTR]: music.title,
                    [MUSIC_KIND_ATTR]: music.kind,
                    [MUSIC_DRAFT_ATTR]: false,
                });
                onMusicAssigned?.(music.id);

                return true;
            },
        });
    };

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles[mode], active && styles.active)}
            data-music-pill="start"
            data-music-id={musicId || undefined}
            contentEditable={false}
            onFocus={handleFocusWithin(setActive)}
            onBlur={handleBlurWithin(rootRef, setActive)}
        >
            {' '}
            <span
                className={styles.tagBody}
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
                >{musicNumber}
                </span>
                {draftTitle.length > 0 || active ? '\u00A0' : null}
                <span
                    ref={titleRef}
                    className={styles.titleInput}
                    data-music-title-input="start"
                    data-music-draft={isDraft ? 'true' : undefined}
                    data-music-id={String(node.attrs[MUSIC_ID_ATTR] ?? '')}
                    data-placeholder={active ? 'music' : undefined}
                    role="textbox"
                    aria-label="Music title"
                    aria-multiline="false"
                    contentEditable
                    tabIndex={-1}
                    suppressContentEditableWarning
                    spellCheck={false}
                    onInput={event => updateTitle(event.currentTarget.textContent ?? '')}
                    onBlur={event => commitTitle(event.currentTarget.textContent ?? '')}
                    onKeyDown={event => {
                        event.stopPropagation();

                        if (event.key === 'Enter') {
                            const currentTitle = event.currentTarget.textContent ?? '';

                            event.preventDefault();
                            commitTitle(currentTitle);
                            requestMusicCreation(currentTitle);
                            event.currentTarget.blur();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setDraftTitle(title);
                            event.currentTarget.textContent = title;
                            updateAttributes({[MUSIC_TITLE_ATTR]: title});
                            event.currentTarget.blur();
                        }
                    }}
                />
            </span>
            {active ? (
                <span
                    className={styles.menu}
                    data-music-menu="start"
                >
                    {hasEndMusic ? (
                        <MusicMenuButton label="Go to music end" onClick={goToEndMusic}>
                            <ArrowRightIcon aria-hidden="true" />
                        </MusicMenuButton>
                    ) : null}
                    {musicId && onOpenMusicManager ? (
                        <MusicMenuButton label="Manage music" onClick={openMusicManager}>
                            <EditPencilIcon aria-hidden="true" />
                        </MusicMenuButton>
                    ) : null}
                    <MusicMenuButton
                        label="Remove music"
                        isDanger
                        onClick={deleteMusic}
                    >
                        <MusicDeleteIcon />
                    </MusicMenuButton>
                </span>
            ) : null}
            {' '}
        </NodeViewWrapper>
    );
};

import {
    ArrowLeftIcon,
    EditPencilIcon,
} from '@stagistic/ui';
import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';
import clsx from 'clsx';

import styles from './MusicPill.module.css';
import {
    MusicDeleteIcon,
    MusicMenuButton,
} from './MusicPillControls';
import {
    findMusicPillElement,
    handleBlurWithin,
    handleFocusWithin,
    readDecorationLabel,
    scrollToMusicPill,
    usePillActivation,
} from './musicPillHelpers';

interface MusicOutPillProps extends NodeViewProps {
    onOpenMusicManager?: (musicId: string) => void,
}

export const MusicOutPill = ({
    deleteNode,
    decorations,
    editor,
    onOpenMusicManager,
}: MusicOutPillProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const musicId = readDecorationLabel(decorations, 'musicId');
    const outLabel = readDecorationLabel(decorations, 'outLabel') || 'out';
    const outNumber = readDecorationLabel(decorations, 'outNumber');
    const outTitle = readDecorationLabel(decorations, 'outTitle');
    const pairedLabel = [
        outNumber,
        outTitle,
        '(end)',
    ].filter(Boolean).join(' ');
    const visibleLabel = musicId ? pairedLabel : outLabel;
    const hasStartMusic = Boolean(musicId && findMusicPillElement(editor, 'start', musicId));
    const openMusicManager = () => {
        if (!musicId) {
            return;
        }

        setActive(false);
        onOpenMusicManager?.(musicId);
    };
    const goToStartMusic = () => {
        setActive(false);
        scrollToMusicPill(editor, 'start', musicId);
    };

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles.out, active && styles.active)}
            data-music-pill="out"
            data-music-id={musicId || undefined}
            contentEditable={false}
            onFocus={handleFocusWithin(setActive)}
            onBlur={handleBlurWithin(rootRef, setActive)}
        >
            <span
                className={clsx(styles.tagBody, styles.outLabel)}
                role="button"
                tabIndex={-1}
                aria-label={visibleLabel}
                onClick={() => setActive(true)}
            >
                {musicId ? (
                    <>
                        <span className={styles.outStrong} data-music-out-primary>{outNumber}</span>
                        {outTitle ? <span className={styles.outTitle} data-music-out-title>{` ${outTitle}`}</span> : null}
                        <span className={styles.outSuffix} data-music-out-suffix> (end)</span>
                    </>
                ) : <span className={styles.outStrong} data-music-out-primary>{outLabel}</span>}
            </span>
            {active ? (
                <span
                    className={styles.menu}
                    data-music-menu="out"
                >
                    {hasStartMusic ? (
                        <MusicMenuButton label="Go to music start" onClick={goToStartMusic}>
                            <ArrowLeftIcon aria-hidden="true" />
                        </MusicMenuButton>
                    ) : null}
                    {musicId && onOpenMusicManager ? (
                        <MusicMenuButton label="Manage music" onClick={openMusicManager}>
                            <EditPencilIcon aria-hidden="true" />
                        </MusicMenuButton>
                    ) : null}
                    <MusicMenuButton
                        label="Delete end"
                        isDanger
                        onClick={() => deleteNode()}
                    >
                        <MusicDeleteIcon />
                    </MusicMenuButton>
                </span>
            ) : null}
        </NodeViewWrapper>
    );
};

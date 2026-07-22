import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';

import styles from './MusicPill.module.css';
import {readDecorationLabel} from './musicPillHelpers';

/**
 * An out is a structural boundary. Its visible representation lives in the
 * canvas music rail, so this node view only keeps a stable zero-width DOM hook
 * for ProseMirror and selection/caret mechanics.
 */
export const MusicOutPill = ({decorations}: NodeViewProps) => {
    const musicId = readDecorationLabel(decorations, 'musicId');

    return (
        <NodeViewWrapper
            as="span"
            className={styles.structuralOut}
            data-music-pill="out"
            data-music-id={musicId || undefined}
            data-music-out="true"
            contentEditable={false}
            aria-hidden="true"
        />
    );
};

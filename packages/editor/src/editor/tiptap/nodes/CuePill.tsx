import {
    CUE_MODE_ATTR,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';

import styles from './CuePill.module.css';

export const CueStartPill = ({node}: NodeViewProps) => {
    const mode = node.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const rawTitle: unknown = node.attrs[CUE_TITLE_ATTR];
    const title = typeof rawTitle === 'string' && rawTitle.length > 0 ? rawTitle : 'cue';

    return (
        <NodeViewWrapper
            as="span"
            className={`${styles.pill} ${styles[mode]}`}
            data-cue-pill="start"
            contentEditable={false}
        >
            <span className={styles.label}>{title}</span>
        </NodeViewWrapper>
    );
};

export const CueOutPill = () => {
    return (
        <NodeViewWrapper
            as="span"
            className={`${styles.pill} ${styles.out}`}
            data-cue-pill="out"
            contentEditable={false}
        >
            <span className={styles.label}>out</span>
        </NodeViewWrapper>
    );
};

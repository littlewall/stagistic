import {
    ArrowLeftIcon,
    EditPencilIcon,
} from '@stagistic/ui';
import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';
import clsx from 'clsx';

import styles from './CuePill.module.css';
import {
    CueDeleteIcon,
    CueMenuButton,
} from './CuePillControls';
import {
    findCuePillElement,
    handleBlurWithin,
    handleFocusWithin,
    readDecorationLabel,
    scrollToCuePill,
    usePillActivation,
} from './cuePillHelpers';

interface CueOutPillProps extends NodeViewProps {
    onOpenCueManager?: (cueId: string) => void,
}

export const CueOutPill = ({
    deleteNode,
    decorations,
    editor,
    onOpenCueManager,
}: CueOutPillProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const cueId = readDecorationLabel(decorations, 'cueId');
    const outLabel = readDecorationLabel(decorations, 'outLabel') || 'out';
    const outNumber = readDecorationLabel(decorations, 'outNumber');
    const outTitle = readDecorationLabel(decorations, 'outTitle');
    const pairedLabel = [
        outNumber,
        outTitle,
        '(end)',
    ].filter(Boolean).join(' ');
    const visibleLabel = cueId ? pairedLabel : outLabel;
    const hasStartCue = Boolean(cueId && findCuePillElement(editor, 'start', cueId));
    const openCueManager = () => {
        if (!cueId) {
            return;
        }

        setActive(false);
        onOpenCueManager?.(cueId);
    };
    const goToStartCue = () => {
        setActive(false);
        scrollToCuePill(editor, 'start', cueId);
    };

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles.out, active && styles.active)}
            data-cue-pill="out"
            data-cue-id={cueId || undefined}
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
                {cueId ? (
                    <>
                        <span className={styles.outStrong} data-cue-out-primary>{outNumber}</span>
                        {outTitle ? <span className={styles.outTitle} data-cue-out-title>{` ${outTitle}`}</span> : null}
                        <span className={styles.outSuffix} data-cue-out-suffix> (end)</span>
                    </>
                ) : <span className={styles.outStrong} data-cue-out-primary>{outLabel}</span>}
            </span>
            {active ? (
                <span
                    className={styles.menu}
                    data-cue-menu="out"
                >
                    {hasStartCue ? (
                        <CueMenuButton label="Go to cue start" onClick={goToStartCue}>
                            <ArrowLeftIcon aria-hidden="true" />
                        </CueMenuButton>
                    ) : null}
                    {cueId && onOpenCueManager ? (
                        <CueMenuButton label="Manage cue" onClick={openCueManager}>
                            <EditPencilIcon aria-hidden="true" />
                        </CueMenuButton>
                    ) : null}
                    <CueMenuButton
                        label="Delete end"
                        isDanger
                        onClick={() => deleteNode()}
                    >
                        <CueDeleteIcon />
                    </CueMenuButton>
                </span>
            ) : null}
        </NodeViewWrapper>
    );
};

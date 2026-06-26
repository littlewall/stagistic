import {
    CUE_MODE_ATTR,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type FocusEvent,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';

import styles from './CuePill.module.css';
import {
    CueDeleteIcon,
    CueMenuButton,
    type CueMode,
    CueModeIcon,
    getModeButtonLabel,
    MoreVerticalIcon,
} from './CuePillControls';

type CueTitleInputStyle = CSSProperties & {'--cue-title-width': string};

const usePillActivation = () => {
    const [active, setActive] = useState(false);
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!active && !open) {
            return undefined;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setActive(false);
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
        };
    }, [active, open]);

    return {
        active,
        open,
        setActive,
        setOpen,
        rootRef,
    };
};

const normalizeTitle = (value: unknown) => {
    return typeof value === 'string' ? value : '';
};

const getTitleInputStyle = (title: string): CueTitleInputStyle => {
    const width = Math.max(title.length, 3);

    return {'--cue-title-width': `${width}ch`};
};

const handleFocusWithin = (setActive: (active: boolean) => void) => {
    return () => setActive(true);
};

const handleBlurWithin = (
    rootRef: RefObject<HTMLSpanElement | null>,
    setActive: (active: boolean) => void,
    setOpen: (open: boolean) => void,
) => {
    return (event: FocusEvent<HTMLSpanElement>) => {
        const nextTarget = event.relatedTarget;

        if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget)) {
            return;
        }

        setActive(false);
        setOpen(false);
    };
};

const handleMenuTriggerMouseDown = (
    setActive: (active: boolean) => void,
    setOpen: (open: boolean | ((open: boolean) => boolean)) => void,
) => {
    return (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setActive(true);
        setOpen(previous => !previous);
    };
};

export const CueStartPill = ({
    node, updateAttributes, deleteNode,
}: NodeViewProps) => {
    const {
        active, open, setActive, setOpen, rootRef,
    } = usePillActivation();
    const mode: CueMode = node.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const title = normalizeTitle(node.attrs[CUE_TITLE_ATTR]);
    const [draftTitle, setDraftTitle] = useState(title);

    useEffect(() => {
        setDraftTitle(title);
    }, [title]);

    const commitTitle = () => {
        const next = draftTitle.trim();

        if (next === title) {
            return;
        }

        setDraftTitle(next);
        updateAttributes({[CUE_TITLE_ATTR]: next});
    };

    const updateTitle = (value: string) => {
        setDraftTitle(value);
        updateAttributes({[CUE_TITLE_ATTR]: value});
    };

    const toggleMode = () => {
        updateAttributes({[CUE_MODE_ATTR]: mode === 'hit' ? 'open' : 'hit'});
        setOpen(false);
    };

    const deleteCue = () => {
        deleteNode();
    };

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles[mode], active && styles.active)}
            data-cue-pill="start"
            contentEditable={false}
            onFocus={handleFocusWithin(setActive)}
            onBlur={handleBlurWithin(rootRef, setActive, setOpen)}
        >
            <span className={styles.tagBody}>
                <input
                    className={styles.titleInput}
                    data-cue-title-input="start"
                    aria-label="Cue title"
                    value={draftTitle}
                    placeholder="cue"
                    spellCheck={false}
                    style={getTitleInputStyle(draftTitle)}
                    onChange={event => updateTitle(event.currentTarget.value)}
                    onBlur={commitTitle}
                    onKeyDown={event => {
                        event.stopPropagation();

                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitTitle();
                            event.currentTarget.blur();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setDraftTitle(title);
                            updateAttributes({[CUE_TITLE_ATTR]: title});
                            event.currentTarget.blur();
                        }
                    }}
                />
                {active ? (
                    <button
                        type="button"
                        className={styles.menuTrigger}
                        data-cue-menu-trigger="start"
                        aria-label="Open cue menu"
                        title="Cue menu"
                        onMouseDown={handleMenuTriggerMouseDown(setActive, setOpen)}
                    >
                        <span className={styles.triggerIcon}>
                            <MoreVerticalIcon />
                        </span>
                    </button>
                ) : null}
            </span>
            {open ? (
                <span
                    className={styles.menu}
                    data-cue-menu="start"
                >
                    <CueMenuButton label={getModeButtonLabel(mode)} onClick={toggleMode}>
                        <CueModeIcon mode={mode} />
                    </CueMenuButton>
                    <CueMenuButton
                        label="Delete cue"
                        isDanger
                        onClick={deleteCue}
                    >
                        <CueDeleteIcon />
                    </CueMenuButton>
                </span>
            ) : null}
        </NodeViewWrapper>
    );
};

export const CueOutPill = ({deleteNode}: NodeViewProps) => {
    const {
        active, open, setActive, setOpen, rootRef,
    } = usePillActivation();

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles.out, active && styles.active)}
            data-cue-pill="out"
            contentEditable={false}
            onFocus={handleFocusWithin(setActive)}
            onBlur={handleBlurWithin(rootRef, setActive, setOpen)}
        >
            <span
                className={clsx(styles.tagBody, styles.outLabel)}
                onClick={() => setActive(true)}
            >
                out
                {active ? (
                    <button
                        type="button"
                        className={styles.menuTrigger}
                        data-cue-menu-trigger="out"
                        aria-label="Open cue end menu"
                        title="Cue end menu"
                        onMouseDown={handleMenuTriggerMouseDown(setActive, setOpen)}
                    >
                        <span className={styles.triggerIcon}>
                            <MoreVerticalIcon />
                        </span>
                    </button>
                ) : null}
            </span>
            {open ? (
                <span
                    className={styles.menu}
                    data-cue-menu="out"
                >
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

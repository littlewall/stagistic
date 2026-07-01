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
} from './CuePillControls';

type CueTitleInputStyle = CSSProperties & {'--cue-title-width': string};

const usePillActivation = () => {
    const [active, setActive] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setActive(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
        };
    }, [active]);

    return {
        active,
        setActive,
        rootRef,
    };
};

const normalizeTitle = (value: unknown) => {
    return typeof value === 'string' ? value : '';
};

const getTitleInputStyle = (title: string): CueTitleInputStyle => {
    // Empty: reserve 3ch for the "cue" placeholder. Otherwise grow exactly with
    // the typed text so the field hugs the content from the first character.
    const width = title.length === 0 ? 3 : title.length;

    return {'--cue-title-width': `${width}ch`};
};

const handleFocusWithin = (setActive: (active: boolean) => void) => {
    return () => setActive(true);
};

const handleBlurWithin = (
    rootRef: RefObject<HTMLSpanElement | null>,
    setActive: (active: boolean) => void,
) => {
    return (event: FocusEvent<HTMLSpanElement>) => {
        const nextTarget = event.relatedTarget;

        if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget)) {
            return;
        }

        setActive(false);
    };
};

const readDecorationLabel = (decorations: NodeViewProps['decorations'], key: string): string => {
    for (const decoration of decorations) {
        const value = (decoration.spec as Record<string, unknown> | undefined)?.[key];

        if (typeof value === 'string') {
            return value;
        }
    }

    return '';
};

export const CueStartPill = ({
    node, updateAttributes, deleteNode, decorations, editor, getPos,
}: NodeViewProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const inputRef = useRef<HTMLInputElement>(null);
    const mode: CueMode = node.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const title = normalizeTitle(node.attrs[CUE_TITLE_ATTR]);
    const cueNumber = readDecorationLabel(decorations, 'cueNumber');
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
    };

    const deleteCue = () => {
        const pos = getPos();

        if (typeof pos !== 'number' || !editor.commands.deleteCueStart(pos)) {
            deleteNode();
        }
    };

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles[mode], active && styles.active)}
            data-cue-pill="start"
            contentEditable={false}
            onFocus={handleFocusWithin(setActive)}
            onBlur={handleBlurWithin(rootRef, setActive)}
        >
            <span
                className={styles.tagBody}
                onMouseDown={event => {
                    if (event.target !== inputRef.current) {
                        event.preventDefault();
                        inputRef.current?.focus();
                    }
                }}
            >
                <span
                    className={styles.number}
                    data-cue-number
                    aria-hidden
                >{cueNumber}
                </span>
                <input
                    ref={inputRef}
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
            </span>
            {active ? (
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

export const CueOutPill = ({deleteNode, decorations}: NodeViewProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const outLabel = readDecorationLabel(decorations, 'outLabel') || 'out';
    const outNumber = readDecorationLabel(decorations, 'outNumber');
    const outTitle = readDecorationLabel(decorations, 'outTitle');

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={clsx(styles.pill, styles.out, active && styles.active)}
            data-cue-pill="out"
            contentEditable={false}
            onFocus={handleFocusWithin(setActive)}
            onBlur={handleBlurWithin(rootRef, setActive)}
        >
            <span
                className={clsx(styles.tagBody, styles.outLabel)}
                role="button"
                tabIndex={-1}
                aria-label={outLabel}
                onClick={() => setActive(true)}
            >
                <span className={styles.outStrong} data-cue-out-primary>{outNumber ? `${outNumber} out` : 'out'}</span>
                {outTitle ? <span className={styles.outTitle} data-cue-out-title>{` (${outTitle})`}</span> : null}
            </span>
            {active ? (
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

import {
    CUE_ID_ATTR,
    CUE_DRAFT_ATTR,
    CUE_KIND_ATTR,
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
import type {
    EditorCueCreateRequest,
    EditorCueRemoveRequest,
} from '../../contracts';
import {
    CueDeleteIcon,
    CueMenuButton,
    type CueMode,
    CueModeIcon,
    getModeButtonLabel,
} from './CuePillControls';

type CueTitleInputStyle = CSSProperties & {
    '--cue-title-width': string,
    '--cue-title-gap': string,
};

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

const getTitleInputStyle = (title: string, active: boolean): CueTitleInputStyle => {
    /*
     * Widths are in `ch` to stay on the export's character grid.
     * - With a title: hug the text exactly (matches export `" number title "`).
     * - Empty + active (being edited): reserve 3ch + gap for the "cue"
     *   placeholder so there's an edit target. This is a transient editing state,
     *   not what the export measures.
     * - Empty + at rest: collapse to zero width/gap so a title-less cue is just
     *   the number, matching the export string `" number "`.
     */
    if (title.length > 0) {
        return {'--cue-title-width': `${title.length}ch`, '--cue-title-gap': '1ch'};
    }

    if (active) {
        return {'--cue-title-width': '3ch', '--cue-title-gap': '1ch'};
    }

    return {'--cue-title-width': '0ch', '--cue-title-gap': '0'};
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

interface CueStartPillProps extends NodeViewProps {
    onCueAssigned?: (cueId: string) => void,
    onRequestCreateCue?: (request: EditorCueCreateRequest) => void,
    onRequestRemoveCue?: (request: EditorCueRemoveRequest) => void,
}

export const CueStartPill = ({
    node,
    updateAttributes,
    deleteNode,
    decorations,
    editor,
    getPos,
    onCueAssigned,
    onRequestCreateCue,
    onRequestRemoveCue,
}: CueStartPillProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const inputRef = useRef<HTMLInputElement>(null);
    const mode: CueMode = node.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const isDraft = node.attrs[CUE_DRAFT_ATTR] === true;
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
        const cueId = String(node.attrs[CUE_ID_ATTR] ?? '');

        if (cueId && onRequestRemoveCue) {
            onRequestRemoveCue({
                cueId,
                title,
                complete: () => editor.commands.unassignCue(cueId),
            });

            return;
        }

        const pos = getPos();

        if (typeof pos !== 'number' || !editor.commands.deleteCueStart(pos)) {
            deleteNode();
        }
    };
    const requestCueCreation = () => {
        const nextTitle = draftTitle.trim();
        const pos = getPos();

        if (!nextTitle || !isDraft || !onRequestCreateCue || typeof pos !== 'number') {
            return;
        }

        const blockId = editor.state.doc.resolve(pos).parent.attrs.id;

        if (typeof blockId !== 'string' || !blockId) {
            return;
        }

        onRequestCreateCue({
            title: nextTitle,
            blockId,
            complete: cue => {
                updateAttributes({
                    [CUE_ID_ATTR]: cue.id,
                    [CUE_TITLE_ATTR]: cue.title,
                    [CUE_KIND_ATTR]: cue.kind,
                    [CUE_DRAFT_ATTR]: false,
                });
                onCueAssigned?.(cue.id);

                return true;
            },
        });
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
                    style={getTitleInputStyle(draftTitle, active)}
                    onChange={event => updateTitle(event.currentTarget.value)}
                    onBlur={commitTitle}
                    onKeyDown={event => {
                        event.stopPropagation();

                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitTitle();
                            requestCueCreation();
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
                        label="Remove cue"
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

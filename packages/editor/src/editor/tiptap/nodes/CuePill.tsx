import {
    CUE_DRAFT_ATTR,
    CUE_ID_ATTR,
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
    type FocusEvent,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    EditorCueCreateRequest,
    EditorCueRemoveRequest,
} from '../../contracts';
import styles from './CuePill.module.css';
import {
    CueDeleteIcon,
    CueMenuButton,
    type CueMode,
    CueModeIcon,
    getModeButtonLabel,
} from './CuePillControls';

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
    const titleRef = useRef<HTMLSpanElement>(null);
    const mode: CueMode = node.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const isDraft = node.attrs[CUE_DRAFT_ATTR] === true;
    const title = normalizeTitle(node.attrs[CUE_TITLE_ATTR]);
    const cueNumber = readDecorationLabel(decorations, 'cueNumber');
    const [draftTitle, setDraftTitle] = useState(title);

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
    const requestCueCreation = (value = titleRef.current?.textContent ?? draftTitle) => {
        const nextTitle = value.trim();
        const pos = getPos();

        if (!nextTitle || !isDraft || !onRequestCreateCue || typeof pos !== 'number') {
            return;
        }

        const candidateBlockId: unknown = editor.state.doc.resolve(pos).parent.attrs.id;

        if (typeof candidateBlockId !== 'string' || !candidateBlockId) {
            return;
        }

        onRequestCreateCue({
            title: nextTitle,
            blockId: candidateBlockId,
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
                    data-cue-number
                    aria-hidden
                >{cueNumber}
                </span>
                {draftTitle.length > 0 || active ? '\u00A0' : null}
                <span
                    ref={titleRef}
                    className={styles.titleInput}
                    data-cue-title-input="start"
                    data-cue-draft={isDraft ? 'true' : undefined}
                    data-cue-id={String(node.attrs[CUE_ID_ATTR] ?? '')}
                    data-placeholder={active ? 'cue' : undefined}
                    role="textbox"
                    aria-label="Cue title"
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
                            requestCueCreation(currentTitle);
                            event.currentTarget.blur();
                        }

                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setDraftTitle(title);
                            event.currentTarget.textContent = title;
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
            {' '}
        </NodeViewWrapper>
    );
};

export const CueOutPill = ({deleteNode, decorations}: NodeViewProps) => {
    const {
        active, setActive, rootRef,
    } = usePillActivation();
    const cueId = readDecorationLabel(decorations, 'cueId');
    const outLabel = readDecorationLabel(decorations, 'outLabel') || 'out';
    const outNumber = readDecorationLabel(decorations, 'outNumber');
    const outTitle = readDecorationLabel(decorations, 'outTitle');

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

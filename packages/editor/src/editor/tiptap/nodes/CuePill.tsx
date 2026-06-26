import {
    CUE_MODE_ATTR,
    CUE_TITLE_ATTR,
} from '@stagistic/script';
import {
    type NodeViewProps,
    NodeViewWrapper,
} from '@tiptap/react';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import styles from './CuePill.module.css';

const usePillMenu = () => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
        };
    }, [open]);

    return {
        open,
        setOpen,
        rootRef,
    };
};

// Keep editor focus/selection when clicking menu buttons; let the title input focus.
const keepEditorFocus = (event: {target: EventTarget | null, preventDefault: () => void}) => {
    if (!(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
    }
};

export const CueStartPill = ({
    node, updateAttributes, deleteNode,
}: NodeViewProps) => {
    const {
        open, setOpen, rootRef,
    } = usePillMenu();
    const [editing, setEditing] = useState(false);
    const mode = node.attrs[CUE_MODE_ATTR] === 'hit' ? 'hit' : 'open';
    const rawTitle: unknown = node.attrs[CUE_TITLE_ATTR];
    const title = typeof rawTitle === 'string' && rawTitle.length > 0 ? rawTitle : 'cue';

    const commitTitle = (value: string) => {
        const next = value.trim();

        if (next.length > 0) {
            updateAttributes({[CUE_TITLE_ATTR]: next});
        }

        setEditing(false);
        setOpen(false);
    };

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={`${styles.pill} ${styles[mode]}`}
            data-cue-pill="start"
            contentEditable={false}
        >
            <span
                className={styles.label}
                onClick={() => {
                    setEditing(false);
                    setOpen(previous => !previous);
                }}
            >
                {title}
            </span>
            {open ? (
                <span
                    className={styles.menu}
                    data-cue-menu="start"
                    onMouseDown={keepEditorFocus}
                >
                    {editing ? (
                        <input
                            autoFocus
                            className={styles.titleInput}
                            defaultValue={typeof rawTitle === 'string' ? rawTitle : ''}
                            onBlur={event => commitTitle(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    commitTitle(event.currentTarget.value);
                                }

                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setEditing(false);
                                }
                            }}
                        />
                    ) : (
                        <>
                            <button
                                type="button"
                                className={styles.menuItem}
                                onClick={() => setEditing(true)}
                            >
                                Edit title
                            </button>
                            <button
                                type="button"
                                className={styles.menuItem}
                                onClick={() => {
                                    updateAttributes({[CUE_MODE_ATTR]: mode === 'hit' ? 'open' : 'hit'});
                                    setOpen(false);
                                }}
                            >
                                {mode === 'hit' ? 'Switch to open' : 'Switch to hit'}
                            </button>
                            <button
                                type="button"
                                className={styles.menuItem}
                                onClick={() => deleteNode()}
                            >
                                Delete cue
                            </button>
                        </>
                    )}
                </span>
            ) : null}
        </NodeViewWrapper>
    );
};

export const CueOutPill = ({deleteNode}: NodeViewProps) => {
    const {
        open, setOpen, rootRef,
    } = usePillMenu();

    return (
        <NodeViewWrapper
            ref={rootRef}
            as="span"
            className={`${styles.pill} ${styles.out}`}
            data-cue-pill="out"
            contentEditable={false}
        >
            <span className={styles.label} onClick={() => setOpen(previous => !previous)}>
                out
            </span>
            {open ? (
                <span
                    className={styles.menu}
                    data-cue-menu="out"
                    onMouseDown={keepEditorFocus}
                >
                    <button
                        type="button"
                        className={styles.menuItem}
                        onClick={() => deleteNode()}
                    >
                        Delete end
                    </button>
                </span>
            ) : null}
        </NodeViewWrapper>
    );
};

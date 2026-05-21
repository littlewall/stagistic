import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../../blocks/fountainBlockRegistry';
import {
    EMPTY_ENTER_CHOOSER_WRITER_TYPES,
    type EmptyEnterChooserState,
    getEmptyEnterChooserFromState,
} from '../../tiptap/extensions/EmptyEnterChooserExtension';
import type {FountainBlockType} from '../../tiptap/fountainCore';
import {
    resolveElementOffsetWithinAncestor,
    resolveFountainBlockElementById,
} from '../blockActions/overlay/geometry';
import {useRafScheduler} from '../blockActions/overlay/useRafScheduler';
import styles from './EmptyEnterBlockChooserOverlay.module.css';

interface EmptyEnterBlockChooserOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
}

interface ChooserAnchorStyle extends CSSProperties {
    top: string,
    left: string,
}

const CLOSED_CHOOSER_STATE: EmptyEnterChooserState = {
    isOpen: false,
    blockId: null,
    blockPos: null,
    blockType: null,
    selectedType: null,
    openedByEmptyEnter: false,
};

const isSameChooserState = (previous: EmptyEnterChooserState, next: EmptyEnterChooserState) => {
    return previous.isOpen === next.isOpen
        && previous.blockId === next.blockId
        && previous.blockPos === next.blockPos
        && previous.blockType === next.blockType
        && previous.selectedType === next.selectedType
        && previous.openedByEmptyEnter === next.openedByEmptyEnter;
};

const isSameAnchorStyle = (
    previous: ChooserAnchorStyle | null,
    next: ChooserAnchorStyle | null,
) => {
    if (previous === next) {
        return true;
    }

    if (!previous || !next) {
        return false;
    }

    return previous.top === next.top && previous.left === next.left;
};

const escapeCssAttributeValue = (value: string) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
    }

    return value.replace(/["\\]/g, '\\$&');
};

const resolveBlockActionsTriggerElement = (
    canvas: HTMLElement,
    blockId: string,
) => {
    const escapedBlockId = escapeCssAttributeValue(blockId);

    return canvas.querySelector<HTMLButtonElement>(
        `[data-block-actions-trigger="true"][data-block-id="${escapedBlockId}"]`,
    );
};

const resolveElementRectOffsetWithinAncestor = (
    element: HTMLElement,
    ancestor: HTMLElement,
) => {
    const elementRect = element.getBoundingClientRect();
    const ancestorRect = ancestor.getBoundingClientRect();

    return {
        top: elementRect.top - ancestorRect.top + ancestor.scrollTop,
        left: elementRect.left - ancestorRect.left + ancestor.scrollLeft,
    };
};

export const EmptyEnterBlockChooserOverlay = ({
    editor,
    canvasRef,
}: EmptyEnterBlockChooserOverlayProps) => {
    const [chooserState, setChooserState] = useState<EmptyEnterChooserState>(() => {
        if (!editor) {
            return CLOSED_CHOOSER_STATE;
        }

        return getEmptyEnterChooserFromState(editor.state);
    });
    const [anchorStyle, setAnchorStyle] = useState<ChooserAnchorStyle | null>(null);
    const {cancel: cancelScheduledAnchorUpdate, schedule} = useRafScheduler();

    const syncChooserStateFromEditor = useCallback((targetEditor: TiptapEditor | null = editor) => {
        if (!targetEditor) {
            setChooserState(previous => {
                if (isSameChooserState(previous, CLOSED_CHOOSER_STATE)) {
                    return previous;
                }

                return CLOSED_CHOOSER_STATE;
            });

            return;
        }

        const nextState = getEmptyEnterChooserFromState(targetEditor.state);

        setChooserState(previous => {
            if (isSameChooserState(previous, nextState)) {
                return previous;
            }

            return nextState;
        });
    }, [editor]);

    useLayoutEffect(() => {
        syncChooserStateFromEditor();
    }, [syncChooserStateFromEditor]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleTransaction = () => {
            syncChooserStateFromEditor(editor);
        };
        const handleBlur = () => {
            const commands = editor.commands as {
                closeEmptyEnterChooser?: () => boolean,
            };

            commands.closeEmptyEnterChooser?.();
            syncChooserStateFromEditor(editor);
        };
        const handleFocus = () => {
            syncChooserStateFromEditor(editor);
        };

        editor.on('transaction', handleTransaction);
        editor.on('blur', handleBlur);
        editor.on('focus', handleFocus);

        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('blur', handleBlur);
            editor.off('focus', handleFocus);
        };
    }, [editor, syncChooserStateFromEditor]);

    const updateAnchor = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas || !chooserState.isOpen || !chooserState.blockId) {
            setAnchorStyle(previous => {
                if (previous === null) {
                    return previous;
                }

                return null;
            });

            return;
        }

        const triggerElement = resolveBlockActionsTriggerElement(canvas, chooserState.blockId);
        let anchorTop = 0;
        let anchorLeft = 0;
        let hasAnchorFromTrigger = false;

        if (triggerElement) {
            const triggerOffset = resolveElementRectOffsetWithinAncestor(triggerElement, canvas);

            if (triggerOffset) {
                anchorTop = triggerOffset.top;
                anchorLeft = triggerOffset.left;
                hasAnchorFromTrigger = true;
            }
        }

        if (!hasAnchorFromTrigger) {
            const blockElement = resolveFountainBlockElementById(
                editor,
                chooserState.blockId,
                chooserState.blockPos,
            );

            if (!blockElement) {
                setAnchorStyle(previous => {
                    if (previous === null) {
                        return previous;
                    }

                    return null;
                });

                return;
            }

            const offset = resolveElementOffsetWithinAncestor(blockElement, canvas);

            if (!offset) {
                setAnchorStyle(previous => {
                    if (previous === null) {
                        return previous;
                    }

                    return null;
                });

                return;
            }

            anchorTop = offset.top;
            anchorLeft = offset.left;
        }

        const nextAnchorStyle: ChooserAnchorStyle = {
            top: `${anchorTop}px`,
            left: `${anchorLeft}px`,
        };

        setAnchorStyle(previous => {
            if (isSameAnchorStyle(previous, nextAnchorStyle)) {
                return previous;
            }

            return nextAnchorStyle;
        });
    }, [
        canvasRef,
        chooserState.blockId,
        chooserState.blockPos,
        chooserState.isOpen,
        editor,
    ]);

    const scheduleAnchorUpdate = useCallback(() => {
        schedule(updateAnchor);
    }, [schedule, updateAnchor]);

    useLayoutEffect(() => {
        if (!chooserState.isOpen) {
            cancelScheduledAnchorUpdate();
            setAnchorStyle(previous => {
                if (previous === null) {
                    return previous;
                }

                return null;
            });

            return;
        }

        scheduleAnchorUpdate();

        return () => {
            cancelScheduledAnchorUpdate();
        };
    }, [
        cancelScheduledAnchorUpdate,
        chooserState.isOpen,
        chooserState.blockId,
        chooserState.blockPos,
        scheduleAnchorUpdate,
    ]);

    useEffect(() => {
        if (!chooserState.isOpen) {
            return;
        }

        const handleWindowResize = () => {
            scheduleAnchorUpdate();
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [chooserState.isOpen, scheduleAnchorUpdate]);

    const labelByType = useMemo(() => {
        const map = new Map<string, string>();

        FOUNTAIN_BLOCKS.forEach(option => {
            map.set(option.type, option.label);
        });

        return map;
    }, []);

    const handleTypeMouseDown = useCallback((
        optionType: FountainBlockType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        if (!editor) {
            return;
        }

        const commands = editor.commands as {
            confirmEmptyEnterChooserType?: (type?: FountainBlockType) => boolean,
        };

        commands.confirmEmptyEnterChooserType?.(optionType);
    }, [editor]);

    if (!editor || !chooserState.isOpen || !anchorStyle) {
        return null;
    }

    return (
        <div className={styles.overlay} style={anchorStyle}>
            <div
                className={styles.panel}
                role="toolbar"
                aria-label="Empty block type chooser"
            >
                {EMPTY_ENTER_CHOOSER_WRITER_TYPES.map(optionType => {
                    const label = labelByType.get(optionType) ?? 'Block';
                    const isActive = chooserState.selectedType === optionType;

                    return (
                        <button
                            key={optionType}
                            type="button"
                            className={clsx(styles.button, isActive && styles.active)}
                            aria-label={`Set block type to ${label}`}
                            title={label}
                            onMouseDown={event => handleTypeMouseDown(optionType, event)}
                        >
                            <span className={styles.icon}>
                                {BLOCK_ICONS[optionType]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default EmptyEnterBlockChooserOverlay;

import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';

import {BLOCKS} from '../../blocks/blockRegistry';
import {
    EMPTY_ENTER_CHOOSER_WRITER_TYPES,
    type EmptyEnterChooserState,
    getEmptyEnterChooserFromState,
} from '../../tiptap/extensions/EmptyEnterChooserExtension';
import type {BlockNodeType} from '../../tiptap/scriptCore';
import {ChooserTypeButton} from './ChooserTypeButton';
import styles from './EmptyEnterBlockChooserOverlay.module.css';
import {useChooserAnchor} from './useChooserAnchor';

interface EmptyEnterBlockChooserOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
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

    const anchorStyle = useChooserAnchor({
        canvasRef, editor, chooserState,
    });

    const labelByType = useMemo(() => {
        const map = new Map<string, string>();

        BLOCKS.forEach(option => {
            map.set(option.type, option.label);
        });

        return map;
    }, []);

    const handleTypeMouseDown = useCallback((
        optionType: BlockNodeType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        if (!editor) {
            return;
        }

        const commands = editor.commands as {
            confirmEmptyEnterChooserType?: (type?: BlockNodeType) => boolean,
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
                {EMPTY_ENTER_CHOOSER_WRITER_TYPES.map(optionType => (
                    <ChooserTypeButton
                        key={optionType}
                        optionType={optionType}
                        label={labelByType.get(optionType) ?? 'Block'}
                        isActive={chooserState.selectedType === optionType}
                        onMouseDown={handleTypeMouseDown}
                    />
                ))}
            </div>
        </div>
    );
};

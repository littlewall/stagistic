import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type CSSProperties,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react';

import type {EmptyEnterChooserState} from '../../tiptap/extensions/EmptyEnterChooserExtension';
import {
    resolveElementOffsetWithinAncestor,
    resolveScriptBlockElementById,
} from '../blockActions/overlay/geometry';
import {useRafScheduler} from '../blockActions/overlay/useRafScheduler';

export interface ChooserAnchorStyle extends CSSProperties {
    top: string,
    left: string,
}

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

const resolveBlockActionsTriggerElement = (canvas: HTMLElement, blockId: string) => {
    const escapedBlockId = escapeCssAttributeValue(blockId);

    return canvas.querySelector<HTMLButtonElement>(
        `[data-block-actions-trigger="true"][data-block-id="${escapedBlockId}"]`,
    );
};

const resolveElementRectOffsetWithinAncestor = (element: HTMLElement, ancestor: HTMLElement) => {
    const elementRect = element.getBoundingClientRect();
    const ancestorRect = ancestor.getBoundingClientRect();

    return {
        top: elementRect.top - ancestorRect.top + ancestor.scrollTop,
        left: elementRect.left - ancestorRect.left + ancestor.scrollLeft,
    };
};

interface UseChooserAnchorArgs {
    canvasRef: RefObject<HTMLElement | null>,
    editor: TiptapEditor | null,
    chooserState: Pick<EmptyEnterChooserState, 'isOpen' | 'blockId' | 'blockPos'>,
}

export const useChooserAnchor = ({
    canvasRef,
    editor,
    chooserState,
}: UseChooserAnchorArgs): ChooserAnchorStyle | null => {
    const [anchorStyle, setAnchorStyle] = useState<ChooserAnchorStyle | null>(null);
    const {cancel: cancelScheduledAnchorUpdate, schedule} = useRafScheduler();

    const updateAnchor = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas || !chooserState.isOpen || !chooserState.blockId) {
            setAnchorStyle(previous => {
                return previous === null ? previous : null;
            });

            return;
        }

        const triggerElement = resolveBlockActionsTriggerElement(canvas, chooserState.blockId);
        const blockElement = resolveScriptBlockElementById(
            editor,
            chooserState.blockId,
            chooserState.blockPos,
        );
        const blockOffset = blockElement
            ? resolveElementOffsetWithinAncestor(blockElement, canvas)
            : null;
        let anchorTop = blockOffset?.top ?? 0;
        let anchorLeft = blockOffset?.left ?? 0;

        if (triggerElement) {
            const triggerOffset = resolveElementRectOffsetWithinAncestor(triggerElement, canvas);

            if (triggerOffset) {
                anchorTop = triggerOffset.top;

                if (!blockOffset) {
                    anchorLeft = triggerOffset.left;
                }
            }
        }

        if (!blockOffset && !triggerElement) {
            setAnchorStyle(previous => {
                return previous === null ? previous : null;
            });

            return;
        }

        const nextAnchorStyle: ChooserAnchorStyle = {
            top: `${anchorTop}px`,
            left: `${anchorLeft}px`,
        };

        setAnchorStyle(previous => {
            return isSameAnchorStyle(previous, nextAnchorStyle) ? previous : nextAnchorStyle;
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
                return previous === null ? previous : null;
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

    return anchorStyle;
};

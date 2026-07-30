import type {Editor as TiptapEditor} from '@tiptap/react';
import type {CSSProperties, RefObject} from 'react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import {resolveScriptBlockElementById} from './overlay/geometry';

export type OverlayAnchorStyle = CSSProperties;

export interface AnchorUpdateOptions {
    allowClearOnMiss?: boolean,
}

interface OverlayActiveBlockState {
    blockId: string,
    blockType: string,
    blockPos: number | null,
}

interface UseBlockActionsOverlayAnchorArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    visibleOverlayState: OverlayActiveBlockState | null,
}

export const resolveBlockFirstLineCenter = (
    container: HTMLElement,
    block: HTMLElement,
) => {
    const containerRect = container.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const computed = window.getComputedStyle(block);
    const paddingTopPx = Number.parseFloat(computed.paddingTop) || 0;
    const computedLineHeight = Number.parseFloat(computed.lineHeight);
    const fontSize = Number.parseFloat(computed.fontSize);
    const lineHeightPx = Number.isFinite(computedLineHeight)
        && computedLineHeight > 0
        ? computedLineHeight
        : Number.isFinite(fontSize) && fontSize > 0
            ? fontSize * 1.2
            : 13 * 1.7;

    return blockRect.top
        - containerRect.top
        + container.scrollTop
        + paddingTopPx
        + lineHeightPx / 2;
};

export const useBlockActionsOverlayAnchor = ({
    editor,
    canvasRef,
    visibleOverlayState,
}: UseBlockActionsOverlayAnchorArgs): OverlayAnchorStyle | null => {
    const [overlayAnchorStyle, setOverlayAnchorStyle] = useState<OverlayAnchorStyle | null>(null);
    const overlayAnchorFrameRef = useRef<number | null>(null);

    const updateOverlayAnchor = useCallback((options?: AnchorUpdateOptions) => {
        const allowClearOnMiss = options?.allowClearOnMiss ?? true;
        const canvas = canvasRef.current;

        if (!editor || !canvas || !visibleOverlayState) {
            if (allowClearOnMiss) {
                setOverlayAnchorStyle(null);
            }

            return false;
        }

        const blockElement = resolveScriptBlockElementById(
            editor,
            visibleOverlayState.blockId,
            visibleOverlayState.blockPos,
        );

        if (!blockElement) {
            if (allowClearOnMiss) {
                setOverlayAnchorStyle(null);
            }

            return false;
        }

        if (!canvas.contains(blockElement)) {
            if (allowClearOnMiss) {
                setOverlayAnchorStyle(null);
            }

            return false;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const blockRect = blockElement.getBoundingClientRect();
        const top = resolveBlockFirstLineCenter(canvas, blockElement);
        const left = blockRect.left - canvasRect.left;
        const nextAnchorStyle: OverlayAnchorStyle = {
            top: `${top}px`,
            left: `${left}px`,
        };

        setOverlayAnchorStyle(previous => {
            if (previous && previous.top === nextAnchorStyle.top && previous.left === nextAnchorStyle.left) {
                return previous;
            }

            return nextAnchorStyle;
        });

        return true;
    }, [
        canvasRef,
        editor,
        visibleOverlayState,
    ]);

    const cancelScheduledOverlayAnchorUpdate = useCallback(() => {
        if (overlayAnchorFrameRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(overlayAnchorFrameRef.current);
        overlayAnchorFrameRef.current = null;
    }, []);

    const scheduleOverlayAnchorUpdate = useCallback((options?: AnchorUpdateOptions) => {
        cancelScheduledOverlayAnchorUpdate();

        if (typeof window === 'undefined') {
            updateOverlayAnchor(options);

            return;
        }

        overlayAnchorFrameRef.current = window.requestAnimationFrame(() => {
            overlayAnchorFrameRef.current = null;
            updateOverlayAnchor(options);
        });
    }, [cancelScheduledOverlayAnchorUpdate, updateOverlayAnchor]);

    useLayoutEffect(() => {
        if (!visibleOverlayState) {
            cancelScheduledOverlayAnchorUpdate();
            updateOverlayAnchor({allowClearOnMiss: true});

            return;
        }

        updateOverlayAnchor({allowClearOnMiss: false});
        scheduleOverlayAnchorUpdate({allowClearOnMiss: true});

        return () => {
            cancelScheduledOverlayAnchorUpdate();
        };
    }, [
        cancelScheduledOverlayAnchorUpdate,
        scheduleOverlayAnchorUpdate,
        updateOverlayAnchor,
        visibleOverlayState,
    ]);

    useEffect(() => {
        if (!visibleOverlayState) {
            return;
        }

        const handleWindowResize = () => {
            scheduleOverlayAnchorUpdate();
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [scheduleOverlayAnchorUpdate, visibleOverlayState]);

    useEffect(() => {
        return () => {
            cancelScheduledOverlayAnchorUpdate();
        };
    }, [cancelScheduledOverlayAnchorUpdate]);

    return overlayAnchorStyle;
};

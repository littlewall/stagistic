import type {
    MouseEvent as ReactMouseEvent,
    ReactNode,
    RefObject,
} from 'react';
import {useState} from 'react';

import {ArcsTooltipContent} from './ArcsTooltipContent';
import type {
    BoardArcsArc,
    BoardArcsPoint,
    BoardArcsScene,
} from './arcsTypes';

const TOOLTIP_OFFSET = 8;

interface TooltipState {
    left?: number,
    right?: number,
    top: number,
    content: ReactNode,
}

/* The hovered character and the tooltip over a point (who, where, the card note) or an arc (who). */
export const useArcsTooltip = (plotRef: RefObject<HTMLElement | null>) => {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const clearTooltip = () => setTooltip(null);

    const showPointTooltip = (event: ReactMouseEvent<SVGElement>, arc: BoardArcsArc, scene: BoardArcsScene, point: BoardArcsPoint) => {
        const containerRect = plotRef.current?.getBoundingClientRect();

        if (!containerRect) return;

        const pointRect = event.currentTarget.getBoundingClientRect();

        setTooltip({
            ...pointRect.left - containerRect.left > containerRect.width / 2
                ? {right: containerRect.right - pointRect.left + TOOLTIP_OFFSET}
                : {left: pointRect.right - containerRect.left + TOOLTIP_OFFSET},
            top: pointRect.top - containerRect.top,
            content: <ArcsTooltipContent arc={arc} scene={scene} note={point.note} />,
        });
    };

    const showArcTooltip = (event: ReactMouseEvent<SVGPathElement>, arc: BoardArcsArc) => {
        const containerRect = plotRef.current?.getBoundingClientRect();

        if (!containerRect) return;

        setTooltip({
            ...event.clientX - containerRect.left > containerRect.width / 2
                ? {right: containerRect.right - event.clientX + TOOLTIP_OFFSET}
                : {left: event.clientX - containerRect.left + TOOLTIP_OFFSET},
            top: event.clientY - containerRect.top + TOOLTIP_OFFSET,
            content: <ArcsTooltipContent arc={arc} />,
        });
    };

    return {
        tooltip,
        showPointTooltip,
        showArcTooltip,
        clearTooltip,
    };
};

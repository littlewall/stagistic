import type {
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
    RefObject,
} from 'react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {ArcsLayout} from './arcsGeometry';
import type {BoardArcsArc} from './arcsTypes';
import {type ArcPointTarget, nearestArcPoint} from './nearestArcPoint';

/** A drag is a click until the pointer has moved this far vertically. */
const DRAG_THRESHOLD = 3;

/* The browser throws for a pointer it no longer tracks; the drag then simply goes on uncaptured. */
const capture = (element: Element, pointerId: number) => {
    try {
        element.setPointerCapture(pointerId);
    } catch {
        // Nothing to capture.
    }
};

const release = (element: Element, pointerId: number) => {
    try {
        element.releasePointerCapture(pointerId);
    } catch {
        // Already released.
    }
};

interface DragState {
    characterId: string,
    headingBlockId: string,
    sceneIndex: number,
    pointerId: number,
    startY: number,
    y: number,
    isMoved: boolean,
}

/*
 * The pointer side of editing: the ghost that follows the cursor over scene columns, a click
 * on the nearest curve that adds a missing point, and the vertical drag of an
 * existing point. A drag writes on release; Escape drops it and the point stays where it was.
 */
export const useArcsPointer = ({
    plotRef,
    layout,
    activeCharacterId,
    arcs,
    sceneCount,
    onActivate,
    onSetPoint,
    onOpenPoint,
    onFocusScene,
}: {
    plotRef: RefObject<HTMLElement | null>,
    layout: ArcsLayout,
    activeCharacterId: string | null,
    arcs: readonly BoardArcsArc[],
    sceneCount: number,
    onActivate: (id: string) => void,
    /** Absent when the Board is read-only. */
    onSetPoint?: (headingBlockId: string, characterId: string, value: number) => void,
    onOpenPoint: (characterId: string, sceneIndex: number) => void,
    /** A mouse edit leaves the keyboard on that scene's stop. */
    onFocusScene: (sceneIndex: number) => void,
}) => {
    const [ghost, setGhost] = useState<ArcPointTarget | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const capturedRef = useRef<Element | null>(null);

    const updateDrag = useCallback((next: DragState | null) => {
        dragRef.current = next;
        setDrag(next);
    }, []);

    const localY = (clientY: number) => clientY - (plotRef.current?.getBoundingClientRect().top ?? 0);

    const cancelDrag = useCallback(() => {
        const current = dragRef.current;

        if (current && capturedRef.current) release(capturedRef.current, current.pointerId);

        capturedRef.current = null;
        updateDrag(null);
    }, [updateDrag]);

    const isDragging = drag !== null;

    useEffect(() => {
        if (!isDragging) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            event.stopPropagation();
            cancelDrag();
        };

        document.addEventListener('keydown', onKeyDown, true);

        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [isDragging, cancelDrag]);

    const columnProps = (sceneIndex: number, headingBlockId: string) => ({
        onPointerMove: (event: ReactPointerEvent<SVGElement>) => {
            if (!dragRef.current) setGhost(nearestArcPoint(arcs, layout, sceneCount, sceneIndex, localY(event.clientY), activeCharacterId));
        },
        onPointerLeave: () => setGhost(null),
        onClick: (event: ReactMouseEvent<SVGElement>) => {
            const target = nearestArcPoint(arcs, layout, sceneCount, sceneIndex, localY(event.clientY), activeCharacterId);

            if (!target) return;

            setGhost(null);
            onActivate(target.characterId);
            onSetPoint?.(headingBlockId, target.characterId, target.value);
            requestAnimationFrame(() => onFocusScene(sceneIndex));
        },
    });

    const pointProps = (characterId: string, headingBlockId: string, sceneIndex: number) => ({
        onPointerDown: (event: ReactPointerEvent<SVGElement>) => {
            if (event.button !== 0) return;

            onActivate(characterId);
            capture(event.currentTarget, event.pointerId);
            capturedRef.current = event.currentTarget;
            setGhost(null);

            const y = localY(event.clientY);

            updateDrag({
                characterId,
                headingBlockId,
                sceneIndex,
                pointerId: event.pointerId,
                startY: y,
                y,
                isMoved: false,
            });
        },
        onPointerMove: (event: ReactPointerEvent<SVGElement>) => {
            const current = dragRef.current;

            if (!current) return;

            const y = localY(event.clientY);

            updateDrag({
                ...current,
                y,
                isMoved: current.isMoved || Math.abs(y - current.startY) >= DRAG_THRESHOLD,
            });
        },
        onPointerUp: (event: ReactPointerEvent<SVGElement>) => {
            const current = dragRef.current;

            if (!current) return;

            release(event.currentTarget, event.pointerId);
            capturedRef.current = null;
            updateDrag(null);

            onFocusScene(current.sceneIndex);

            if (current.isMoved) onSetPoint?.(current.headingBlockId, current.characterId, layout.valueAt(current.y));
            else onOpenPoint(current.characterId, current.sceneIndex);
        },
        onPointerCancel: cancelDrag,
    });

    return {
        ghost: drag ? null : ghost,
        drag: drag?.isMoved ? drag : null,
        columnProps,
        pointProps,
    };
};
